# EU4-Nation-Planner-Server

This is the portion of of the Europa Universalis IV Nation Planner that handles the connection between the application and the database. The server code is, in its current form, not intended to be too complex, and is will be at the effective mercy of the application's, or the database's, needs.

### Composition

The server-side code is a Node.js solution utilizing the Express.js framework. Incredibly standard stuff, but it was stuff I was familiar with. Also being utilized is the package 'pg' to make the connections to the database, which utilizes Postgres. I knew the database would require a relational model, and I wanted to try a different management tool after working with Microsoft's SQL management tool. While currently a simple implementation of 'pg', I intend to introduce views and stored procedures as the project expands in scope, which may impact how this portion of the project interacts with the database.

### Use

Use is utterly pointless without the database. However, the server can be started locally.

The application can be prepped by installing packages using the following command:
```
npm install
```

After that, starting the application can be done using the following command:
```
npm start
```