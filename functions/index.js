/*
handles firestore document updates and sends them the the firea backend
*/

const functions = require('firebase-functions');
const axios = require('axios')
const config = require("./config");


exports.fsStreamCollection = functions.handler.firestore.document.onWrite((change, context) => {
    functions.logger.log('Sync Collection');

      //payload sent to the firea backend
      const data = {
        'collection_name':config.default.collectionPath,
        'doc':change.after.data(),
        'api_key':config.default.ProjectApiKey,
        'doc_id':change.after.id,
      };
      
      //Enpoint of the firea backend data server 
      //todo route based on location server
      //const dataEndpoint = 'https://qa-firea.anvil.app/_/api/data';
      const dataEndpoint = "https://eu-central-1.aws.data.mongodb-api.com/app/firea_main-lxgkm/endpoint/update"

      axios.post(dataEndpoint, data).then(res => {
          functions.logger.log('STATUS',res.status);
        })
        .catch(err => {
          functions.logger.log('Error',err);
        })
    });