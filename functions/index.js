/*
handles firestore document updates and sends them the the firea backend
*/
const functions = require('firebase-functions');
const { initializeApp,getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { FieldPath } = require('firebase-admin/firestore')
const { getFunctions } = require("firebase-admin/functions");
const { getExtensions } = require("firebase-admin/extensions");
const axios = require('axios');


const extensionConfig = {
    location: process.env.LOCATION || "us-central1",
    collectionPath: process.env.COLLECTION_PATH || "collectionName",
    projectApiKey: process.env.PROJECT_API_KEY || "some_api_key",
    fireaProjectId: process.env.F_PROJECT_ID || "some_api_key",
};

exports.fireaSyncDocument = functions.firestore.document(extensionConfig.collectionPath).onWrite((change, context) => {

      //check if document was deleted
      const isDocDeleted = !change.after.exists;
      const docRef = change.after.ref.path;

      //sert header for sending to the firea backend
      let requestOptions = {
        headers: {
          "X-Firea-Api-Key": extensionConfig.projectApiKey,
          "X-Firea-Project-Id":extensionConfig.fireaProjectId,
          "X-Firea-Collection-Id":extensionConfig.collectionPath,
          "X-Firea-DocPath":docRef,
        }
      }

      //payload sent to the firea backend database
      var data = {}
      if (isDocDeleted){
        data = {'__DELETE_DOCUMENT__':change.after.id}
      } else {
        data = change.after.data();
        data['_id'] = change.after.id;
      }
      
      //post to the endpoint of the firea data server for indexing
      const dataEndpoint = "https://update-a6smmjqo7a-uc.a.run.app/update";
      
      axios.post(dataEndpoint, data, requestOptions).then(res => {
          functions.logger.log('Firea Sync Done',res.status);
        })
        .catch(err => {
          functions.logger.log('Firea Sync Error',err);
        })
    });


exports.fireaAggregate = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'failed-precondition', 
        'The function must be called while authenticated.'
        );
    }

    // Get user information
    const uid = context.auth.uid;
    const userToken = context.auth.token || null;
    
    //request data
    const text = data.text;
    const collectionId = data.collectionId;
    const aggPipeline = data.aggPipeline;
    functions.logger.log('collectionId',collectionId);
    functions.logger.log('aggPipeline',aggPipeline);

    //set header for sending to the firea backend
    let requestOptions = {
      headers: {
        "X-Firea-Api-Key": extensionConfig.projectApiKey,
        "X-Firea-Project-Id":extensionConfig.fireaProjectId,
        "X-Firea-Collection-Id":extensionConfig.collectionPath,
        "X-Firea-User-Uid":uid,
        "X-Firea-User-Token":userToken,
      }
    }

    //execute the aggregation on the fires server
    const dataEndpoint = "https://aggregation-a6smmjqo7a-uc.a.run.app";
    return axios.post(dataEndpoint, aggPipeline, requestOptions).then(res => {
        return res.data;
      })
      .catch(err => {
        functions.logger.log('Firea Sync Error',err);
        return err;
      })
});



exports.fireaBackfillData = functions.tasks.taskQueue().onDispatch(async (data) => {

  //todo: in any case send an http req to create database records on the backend
  //create header for sending to the firea backend
  var requestOptions = {
    headers: {
      "X-Firea-Api-Key": extensionConfig.projectApiKey,
      "X-Firea-Project-Id":extensionConfig.fireaProjectId,
      "X-Firea-Collection-Id":extensionConfig.collectionPath,
    }
  }

  //Check if Backfill is enabled by the user
  if (!process.env.DO_BACKFILL) {
    await runtime.setProcessingState("PROCESSING_COMPLETE", "Existing documents where not backfilled");
    return;
  } 
  
  // When a lifecycle event triggers this function, it doesn't pass any data - thus zero
  const offset = data["offset"] ?? null;
  var docsPerBackfill = 1000;

  //init firebase application
  if ( !getApps().length ) initializeApp()

  //Build query and snapshot
  var fsQuery = getFirestore()
    .collection(process.env.COLLECTION_PATH)

  if (offset === null ) {
    functions.logger.log('Working with offset null',offset);
    fsQuery = fsQuery.limit(docsPerBackfill);
  } else {
    functions.logger.log('Working with offset != null',offset);
    fsQuery = fsQuery.startAfter(offset).limit(docsPerBackfill);
  }
  const snapshot = await fsQuery.get();

  // Process each document in the batch.
  const processed = await Promise.allSettled(
    snapshot.docs.map(async (documentSnapshot) => {
      //payload sent to the firea backend database
      var data = documentSnapshot.data();
      data['_id'] = documentSnapshot.id;
      offset = documentSnapshot.id;
      requestOptions["X-Firea-DocPath"] = documentSnapshot.ref.path;

      //post to the endpoint of the firea server for indexing
      const dataEndpoint = "https://update-a6smmjqo7a-uc.a.run.app/update";
      axios.post(dataEndpoint, data, requestOptions).then(res => {
          functions.logger.log('Firea Doc Sync Done',res.status);
        })
        .catch(err => {
          functions.logger.log('Firea Sync Error',err);
        })
    })
  );

  if (processed.length == docsPerBackfill) {
      // If we processed a full batch, there are probably more documents to sync
      functions.logger.log('Queing another function',processed.length);
      functions.logger.log('offset is',offset);
      const queue = getFunctions().taskQueue(
      "backfilldata",
      process.env.EXT_INSTANCE_ID
    );
    await queue.enqueue({
      offset: offset,
    });
  } else {
    functions.logger.log('Processing complete',processed.length);
      // Processing is complete. Report status to the user (see below).
      getExtensions().runtime().setProcessingState(
        "PROCESSING_COMPLETE",
        "Backfill complete. Successfully processed documents."
      );
  }
});