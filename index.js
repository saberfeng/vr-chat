'use strict'

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
const WebSocket = require('ws');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  	fileServer.serve(req, res);
}).listen(8080);

const WebSocketServer = WebSocket.Server;
const wss = new WebSocketServer({port:3000});

var index = 0;

wss.broadcast = function(room,message){
	wss.clients.forEach(function(client){
		if(client.room === room){
			client.send(message);
		}
	});
}

//TODO: change this function to be member of ws in order to eliminate the 'ws' parameter
//be cautious about #this pointer
function sendtopeer(ws,message){
	wss.clients.forEach(function(client){
		var boo = (client.user===ws.user);
		console.log('sendtopeer: client.room: '+client.room+' same as sender?'+boo);
		if((client.user !== ws.user) && (client.room === ws.room)){
			client.send(JSON.stringify(message));
			console.log('sendtopeer successfully:'+message);
		}

	});
}

var rooms = new Array();

wss.on('connection',function(ws){

	ws.user = createIndex();

	ws.on('message',function(message){
		var msg = JSON.parse(message);
		console.log(msg.type);
		console.log(msg);

		if(msg.type === 'create or join'){
			onCreateOrJoin(msg.data.room,ws);
		}else if(msg.type === 'candidate'){
			log(ws,'send candidate to server'+msg.type.candidate);
			sendtopeer(ws,msg);
		}else if(msg.type === 'offer'){
			log(ws,'offer'+msg.data);
			sendtopeer(ws,msg);
		}else if(msg.type === 'answer'){
			log(ws,'answer'+msg.data);
			sendtopeer(ws,msg);
		}else if(msg.type === 'ready'){
			wss.broadcast(msg.data.room,createMessage('ready',{}));
		}else{
			log(ws,'invalid message');
		}
		
	});
});

function onCreateOrJoin(room,ws){
	log(ws,'Received request to create or join room'+room);

	var numClients = roomClients(room);
	log(ws,'Room '+room+' now has '+numClients+' clients');

	if(numClients === 0){
		log(ws,'created room');
		rooms[rooms.length]={ name:room,num:1};
		ws.room = room;
		ws.send(createMessage('created',{room:room}));
	}else if(numClients === 1){
		log(ws,'joined room');
		rooms[indexOfRoom(room)].num++;
		ws.room = room;
		wss.broadcast(room,createMessage('joined',{room:room}));
		ws.send(createMessage('joined',{room:room}));
	}else {
		ws.send(createMessage('full',{room:room}));
	}
}

function createMessage(type,data){
	return JSON.stringify({
		type:type,
		data:data
	});
}

function roomClients(roomname){
	for(var room of rooms){
		if(room.name === roomname){
		return room.num;
		}
	}
	return 0;
}

function indexOfRoom(roomname){
	for(var i = 0;i < rooms.length;++i){
		if(rooms[i].name === roomname)
		return i;
	}
	return -1;
}

function log(ws,content) {
    var info = 'Message from server:'+content;
	console.log(info);
    ws.send(createMessage('log',{log:info}));
}

function createIndex(){
	index++;
	return index;
}
