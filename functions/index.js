/*

*/


import { firestore } from "firebase-functions";

export const fsStreamCollection = firestore.document("users/{userId}").onWrite((change, context) => {
      // If we set `/users/marie` to {name: "Marie"} then
      // context.params.userId == "marie"
      // change.after.data() == {name: "Marie"}
      console.log('hello function');
      console.log(change);
      console.log(context);
    });