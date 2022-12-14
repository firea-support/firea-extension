/*
handles all communication with the firea.io backend via http requests
*/

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extensionConfig = require('./config');
const axios = require('axios');
const functions = require('firebase-functions');

//Helper to create authentication header for the firea backend
function _getBaseHeader(docPath=null,userData=null,deleteDoc=null,collectionId=null){
    //construct base header 
    var baseHeader = {
        "Content-Type":"application/json",
        "X-Firea-Api-Key": extensionConfig.default.projectApiKey,
        "X-Firea-Project-Id":extensionConfig.default.fireaProjectId,
        "X-Firea-Collection-Id":extensionConfig.default.collectionPath,
    }
    //add optional header parameters for different enpoints
    if (docPath != null) {baseHeader['X-Firea-DocPath']=docPath}
    if (userData != null) {baseHeader['X-Firea-User-Map']=userData}
    if (deleteDoc != null) {baseHeader['X-Firea-Delete-Doc']='true'}
    if (collectionId != null) {baseHeader['X-Firea-Collection-Id']=collectionId}
    return baseHeader;
}

//Route to the nearest firea.io endpoint
function _getNarrowRegion(){
    const euRegions = ['europe-central2','europe-west1','europe-west2','europe-west3','europe-west6'];
    if (extensionConfig.default.location in euRegions){
        return 'eu1';
    } else {
        return 'us1';
    }
}

function _getAggEndpoint(){
    //DEBUG ONLY - QA Endpoint!
    return 'https://aggregation-qa-a6smmjqo7a-ey.a.run.app/aggregate';

    if (_getNarrowRegion() == 'eu1'){
        return 'https://aggregation-eu-a6smmjqo7a-ey.a.run.app/aggregate';
    } else {
        return 'https://aggregation-us-a6smmjqo7a-uc.a.run.app/aggregate';
    }
}

function _getUpdateEndpoint(){
    //DEBUG ONLY - QA Endpoint!
    return 'https://update-qa-a6smmjqo7a-ey.a.run.app/update';

    if (_getNarrowRegion() == 'eu1'){
        return 'https://update-eu-a6smmjqo7a-ey.a.run.app/update';
    } else {
        return 'https://update-us-a6smmjqo7a-uc.a.run.app/update';

    }
}

function _getCollectionEndpoint(){
    //DEBUG ONLY - QA Endpoint
    return 'https://add-collection-qa-a6smmjqo7a-ey.a.run.app/collection';

    if (_getNarrowRegion()== 'eu1') {
        return 'https://add-collection-eu-a6smmjqo7a-ey.a.run.app/collection';
    } else {
        return 'https://add-collection-us-a6smmjqo7a-uc.a.run.app/collection';
    }
}


//bridge that syncs each firestore document to the firea.io backend database
exports.syncDoc = function fireaSyncDoc(docId,docData,docPath,deleteDoc=false) {
    const requestOptions = {headers:_getBaseHeader(docPath=docPath,deleteDoc=deleteDoc),timeout:3000};
    const dataEndpoint = _getUpdateEndpoint();

    //add firestore documentId to payload data
    docData['_id'] = docId;
    
    //execute post request
    return axios.post(dataEndpoint, docData, requestOptions).
    then(res => {
        functions.logger.log('FireaDocSync Successful',res.status);
    })
    .catch(function (error) {
        functions.logger.log('FireaDocSync Failed',error);
    });
    
};


//takes in a collection name and an aggregation pipeline and exectutes the aggreation
exports.getAggregation = function fireaGetAggregation(collectionId,aggPipeline,userData) {
    //request parameters
    const requestOptions = {headers:_getBaseHeader(userData=userData,collectionId=collectionId),timeout:3000};
    const dataEndpoint = _getAggEndpoint();

    //execute the aggregation on the fires server
    return axios.post(dataEndpoint, aggPipeline, requestOptions).
    then(res => {
        functions.logger.log('Aggregation Success');
        return res.data;
    })
    .catch(function (error) {
        functions.logger.log('Firea Aggregation Failed',error);
    });
};


//For first extension installation - create new collection in project
exports.createCollection = function fireaCreateCollection() {
    //request parameters
    const requestOptions = {headers:_getBaseHeader(),timeout:3000};
    const dataEndpoint = _getCollectionEndpoint();
    const reqData = {};

    //execute the aggregation on the fires server
    return axios.post(dataEndpoint, reqData, requestOptions).then(res => {
        return res.data;
    })
    .catch(function (error) {
        functions.logger.log('Firea Create Collection Failed',error);
    });
};