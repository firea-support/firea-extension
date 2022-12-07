/*
handles firestore document updates and sends them the the firea backend
*/

const functions = require('firebase-functions');
const axios = require('axios')
const extensionConfig = require("./config");


exports.fsStreamCollection = functions.handler.firestore.document.onWrite((change, context) => {
    functions.logger.log('Sync Collection');
    
    //check if doc was deleted
    const isDocDeleted = !change.after.exists;
    const docRef = change.after.ref.path;

      //header for sending to firea backend
      let requestOptions = {
        headers: {
          "X-Firea-Api-Key": extensionConfig.default.projectApiKey,
          "X-Firea-Project-Id":extensionConfig.default.fireaProjectId,
          "X-Firea-Collection-Id":extensionConfig.default.collectionPath,
          "X-Firea-DocPath":docRef,
        }
      }
      

      //payload sent to the firea backend 
      var data = {}
      if (isDocDeleted){
        data = {'__DELETE_DOCUMENT__':change.after.id}
      } else {
        data = change.after.data();
        data['_id'] = change.after.id;
      }

      //Enpoint of the firea backend data server 
      //todo route data based on location to the nearest firea server
      const dataEndpoint = "https://update-a6smmjqo7a-uc.a.run.app/update";

      axios.post(dataEndpoint, data, requestOptions).then(res => {
          functions.logger.log('STATUS',res.status);
        })
        .catch(err => {
          functions.logger.log('Error',err);
        })
    });