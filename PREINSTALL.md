Use this extension if you want to query the collectio via the MQL query language via Firea.io.

This extension listens to your specified Cloud Firestore collection and syncs the changes to Firea.io.
Go to https://www.firea.io/ to get you API-Key.

#### Multiple collections

To sync multiple collections, install this extension multiple times, specifying a different
collection path each time. There is currently no limit on how many instances of an extension you
can install.


#### Collection Group

Currently you can only sync single Collections. We are working on supporting collection group syncs.
#### Additional setup

Before installing this extension, make sure that you've [set up a Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) in your Firebase project.

Also make sure to create your Firea.io account https://www.firea.io/ to get you API-Key.


#### Billing
To install an extension, your project must be on the [Blaze (pay as you go) plan](https://firebase.google.com/pricing)
- See Firea.io for Billing
- You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).
- This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service’s no-cost tier:
  - Cloud Firestore
  - Cloud Functions (Node.js 10+ runtime. [See FAQs](https://firebase.google.com/support/faq#extensions-pricing))
