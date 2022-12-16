/*
handles firestore document updates and sends them the the firea backend
*/
const extensionConfig = require('./config');
const functions = require('firebase-functions');
const { initializeApp,getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require("firebase-admin/functions");
const { getExtensions } = require("firebase-admin/extensions");
const firea = require('./firea');

exports.fireaSyncDocument = functions.handler.firestore.document.onWrite((change, context) => {
    //check if document was deleted
    const docId = change.after.id;
    const docData = change.after.data();
    const docPath = change.after.ref.path;
    const isDocDeleted = !change.after.exists;

    //post to the endpoint of the firea data server for indexing
    try{
      firea.syncDoc(docId,docData,docPath,deleteDoc=isDocDeleted)
      functions.logger.log('doc sync success',docId);

    } catch (error) {
      //todo throw error to retry syncing
      functions.logger.log('Fatal Syncing Document',error);
    }
});

exports.fireaAggregate = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'failed-precondition', 
        'The function must be called while authenticated.'
        );
    }

    // Get information to relay to firea backend
    const userData = context.auth.token || null;
    const collectionId = data.collectionId;
    const aggPipeline = data.query;

    //execute aggreation
    return firea.getAggregation(collectionId,aggPipeline,userData);
});



exports.fireaBackfillData = functions.tasks.taskQueue().onDispatch(async (data) => {
  functions.logger.log('start backfill round',data);
  //Parameters from previous runs
  const lastSnapshot = data["lastSnapshot"] ?? null;
  const docsPerBackfill = 1000;
  
  //1. request to create a new collection record if function is called the first time
  try {
    if (lastSnapshot == null) {firea.createCollection()};
  } catch (error) {
    functions.logger.log('Fatal Error creating new collection',error);
    getExtensions().runtime().setProcessingState("PROCESSING_FAILED",
      `Creation failed. ${error}. Try the install again or contact support@firea.io`
    );
    return;  
  }

  //2. Check if Backfill is enabled by the user, abort if not
  if (!process.env.DO_BACKFILL) {
    functions.logger.log('No Backfill selected - return',process.env.DO_BACKFILL);
    getExtensions().runtime().setProcessingState("PROCESSING_COMPLETE", "no backfill performed");
    return;
  } 

  //3. Start Backfilling Process
  if (!getApps().length) {
    await initializeApp();
  }

  //3.2 build a query and snapshot / startAfter lastDoc if n+1th loop
  const collectionPath = extensionConfig.default.collectionPath; //companies/{}
  var fsQuery = getFirestore()

  //decide whether to use a collection group query
  if (collectionPath.includes("/")){
    const lastConnection = collectionPath.split('/').pop();
    functions.logger.log('last collection',lastConnection);
    fsQuery = fsQuery.collectionGroup(lastConnection);
  } else {
    fsQuery = fsQuery.collection(collectionPath);
  }
  //in case its not the first invocation add pagination
  if (lastSnapshot != null ) { fsQuery = fsQuery.startAfter(lastSnapshot);}
  //limit to batch size
  fsQuery = fsQuery.limit(docsPerBackfill);

  //3.3 execute query, loop over all docs and send them to the backend
  const snapshot = await fsQuery.get();
  functions.logger.log('snapshot docs',snapshot.docs);
  const processed = await Promise.allSettled(
    snapshot.docs.map(async (documentSnapshot) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 50));
        await firea.syncDoc(documentSnapshot.id,documentSnapshot.data(),documentSnapshot.ref.path);
      }catch (error) {
        functions.logger.log('error doc could not be backfilled',error);
      }
    })
  );
  
  //print each sync result
  processed.forEach((result) => {
    if (result.status == 'rejected'){
      functions.logger.log('Result Rejected ',result.reason);
    } else {
      functions.logger.log('Status ',result.status);
    }
  });

  //3.4 check progress of the sending process
  if (processed.length == docsPerBackfill) {
    //it will proboably need another batch
    functions.logger.log('enqueue another backfill task',processed.length);
    const queue = getFunctions().taskQueue("backfilldata",process.env.EXT_INSTANCE_ID);
    await queue.enqueue({lastSnapshot: lastSnapshot});
  } else {
    //batch is done - set extension to complete state
    functions.logger.log('backfill finished',processed.length);
    getExtensions().runtime().setProcessingState(
      "PROCESSING_COMPLETE",
      "Backfill complete. Successfully processed documents."
    );
  }
});


