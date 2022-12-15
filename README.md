# Firea.io - Supercharge your Firestore Database
**Author**: Firea.io (https://www.firea.io/)

**Description**: Use powerful MQL Queries to use allow for aggregation, groupby and complex querys to your database

---

## 🧩 Install this extension
https://console.firebase.google.com/project/_/extensions/install?ref=firea/firea-sync@0.2.1


---

**Details**: This Extension allows you to sync specific collections to Firea which allows you to use the powerfull mql query language to write advance aggregation queries. 


## Additional setup

Before you can use this extension, you will need to create a Firea.io account and get your apiKey.


**Note:** If you exceed your free plan newer documents will no longer be indexed.

## Billing

Check out https://www.firea.io/ for pricing. If you have special requirements we offer startup discounts as well as enterprise pricing.

Each synced document will incur as one read. 
MQL Aggregations will not count as writes as they are not performed on the firestore database.

**Configuration Parameters:**

- Cloud Functions location: Where do you want to deploy the functions created for this extension? You usually want a location close to your database. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

- Firea API Key: What is the API key that will be used to call Firea.io?

- Firea Project ID: What is the Project ID that will be used to call Firea.io?

- Collection path: What is the path to the collection that contains the comments you want to analyze?

**Cloud Functions:**

- **fireaSyncDocument:** Listens for updates to your specified Cloud Firestore collection, and updates the firea.io backend index.

**Access Required**:

This extension will operate with the following project IAM roles:

- datastore.user (Reason: Allows the extension to write comment analysis results to Cloud Firestore.)
