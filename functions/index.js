
const functions = require('firebase-functions');

exports.capitalizeMessages = functions.database.ref('/messages/{messageId}/content')
    .onWrite(async (change, context) => {
        const content = change.after.val();
        if (content) {
            const uppercase = content.toUpperCase();
            // Add a sibling that has the uppercase content.
            return change.after.ref.parent.child('uppercaseContent').set(uppercase);
        }

        const Http = new XMLHttpRequest();
        const url='https://eu-central-1.aws.data.mongodb-api.com/app/markone_web_qa-qvorh/endpoint/update_order';
        Http.open("POST", url);
        Http.send();
        
        Http.onreadystatechange = (e) => {
          console.log(Http.responseText)
        }


    });