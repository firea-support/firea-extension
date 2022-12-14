/*
handles firestore document updates and sends them the the firea backend
*/
const functions = require('firebase-functions');
const { initializeApp,getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require("firebase-admin/functions");
const { getExtensions } = require("firebase-admin/extensions");
const extensionConfig = require('./config');
const firea = require('./firea');

exports.fireaSyncDocument = functions.firestore.document(extensionConfig.default.collectionPath).onWrite((change, context) => {
    //check if document was deleted
    const docId = change.after.id;
    const docData = change.after.data();
    const docPath = change.after.ref.path;
    const isDocDeleted = !change.after.exists;

    //post to the endpoint of the firea data server for indexing
    firea.syncDoc(docId,docData,docPath,deleteDoc=isDocDeleted)
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
    const aggPipeline = data.aggPipeline;

    //execute aggreation
    return firea.getAggregation(collectionId,aggPipeline,userData);
});


exports.fireaBackfillData = functions.tasks.taskQueue().onDispatch(async (data) => {

  //1 request to create a new collection record
  try{
    firea.createCollection();
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

  //3. Start Backfill Process
  const lastSnapshot = data["lastSnapshot"] ?? null;
  const docsPerBackfill = 1000;

  //3.1 init firebase application
  if (!getApps().length) {
    await initializeApp();
  }

  //3.2 build a query and snapshot / startAfter lastDoc if n+1th loop
  var fsQuery = getFirestore().collection(extensionConfig.default.collectionPath);
  if (lastSnapshot != null ) { fsQuery = fsQuery.startAfter(lastSnapshot);}
  fsQuery = fsQuery.limit(docsPerBackfill);

  //3.3 execute query, loop over all docs and send them to the backend
  const snapshot = await fsQuery.get();
  functions.logger.log('snapshot docs',snapshot.docs);
  const processed = await Promise.allSettled(
    snapshot.docs.map(async (documentSnapshot) => {
      try{
        await firea.syncDoc(documentSnapshot.id,documentSnapshot.data(),documentSnapshot.ref.path);
      }catch (error) {
        functions.logger.log('error doc could not be backfilled',error);
      }
    })
  );

  //DEBUG ONLY - print each sync result
  processed.forEach((result) => {
    functions.logger.log('Status',result.status);
    if (result.status == 'rejected'){
      functions.logger.log('Result Rejected ',result.reason);
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


