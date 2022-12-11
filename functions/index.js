/*
handles firestore document updates and sends them the the firea backend
*/

const functions = require('firebase-functions');
const axios = require('axios')
const extensionConfig = require("./config");


exports.fsStreamCollection = functions.handler.firestore.document.onWrite((change, context) => {

      //check if document was deleted
      const isDocDeleted = !change.after.exists;
      const docRef = change.after.ref.path;

      //sert header for sending to the firea backend
      let requestOptions = {
        headers: {
          "X-Firea-Api-Key": extensionConfig.default.projectApiKey,
          "X-Firea-Project-Id":extensionConfig.default.fireaProjectId,
          "X-Firea-Collection-Id":extensionConfig.default.collectionPath,
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
      throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'while authenticated.');
    }

    // Get user information
    const uid = context.auth.uid;
    const userToken = context.auth.token || null;
    
    //request data
    const text = data.text;
    const collectionId = data.collectionId;
    const aggPipeline = data.aggPipeline;

    //set header for sending to the firea backend
    let requestOptions = {
      headers: {
        "X-Firea-Api-Key": extensionConfig.default.projectApiKey,
        "X-Firea-Project-Id":extensionConfig.default.fireaProjectId,
        "X-Firea-Collection-Id":extensionConfig.default.collectionPath,
        "X-Firea-User-Uid":uid,
        "X-Firea-User-Token":userToken,
      }
    }

    
    //execute the aggregation on the fires server
    const dataEndpoint = "https://aggregation-a6smmjqo7a-uc.a.run.app";
    axios.post(dataEndpoint, aggPipeline, requestOptions).then(res => {
        return res;
      })
      .catch(err => {
        functions.logger.log('Firea Sync Error',err);
      })
});

