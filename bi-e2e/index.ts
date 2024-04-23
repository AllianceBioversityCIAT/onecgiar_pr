import Server from "./classes/server";
import router from "./routes/router";
import express from 'express';
import cors from 'cors';

const server = new Server();
const {app} = server;

app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(cors({origin: true, credentials: true}))

server.start(() => {
  console.log(`Server running - http://localhost:${server.port}`);
});


app.use('/', router);
  
