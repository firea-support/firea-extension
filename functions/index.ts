
/*
 * Copyright 2022 Mark.One GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as functions from 'firebase-functions';
import * as logs from './logs';
import config from './config';


/*
docChanged is the main cloud function to catch all database changes
*/

export const docChanged = functions.handler.firestore.document.onCreate(
    async (snap, context) => {
        try {
          const payload = snap.data();
          uploadChange(payload)

        }catch (e){
            logs.fireaError(e)
        }}

);

/*
uploadChange is responsible for sending the data change to the firea backend
*/
async function uploadChange(payload) {
    try {
      //Upload doc via http request
      //todo send USER API Key along!
      const response = await fetch('https://eu-central-1.aws.data.mongodb-api.com/app/markone_web_qa-qvorh/endpoint/update_order', {
        method: 'POST',
        body: JSON.stringify({name: 'John Smith', job: 'manager'}),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      
      // Check Result
      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }
  
      const result = (await response.json());
      console.log('result is: ', JSON.stringify(result, null, 4));
  
    } catch (error) {
        //Something went wrong with the http request
        logs.fireaError(error);
    }
  }
  



