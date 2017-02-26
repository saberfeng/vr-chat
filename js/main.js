'use strict'

//use my own server? 
var configuration = {
   'iceServers': [{
     'url': 'stun:stun.services.mozilla.com'
   }]
 };

/*
var localVideo = document.getElementById('localvideo');
var remoteVideo = document.getElementById('remotevideo');
var callBtn = document.querySelector('call');
var hangupBtn = document.querySelector('hangup');
*/

var isInitiator = false;
var room = window.location.hash.substring(1);
if(!room){
    room = window.location.hash = randomToken();
}

var connection = new WebSocket('ws://'+window.location.hostname+':3000');

var localstream;
var track;

function createMessage(type,data){
  return JSON.stringify({
    type:type,
    data:data
  });
}

connection.onmessage = function(event){
  var data = event.data;
  console.log('Client received message:'+data);
  var msg = JSON.parse(data);

	switch(msg.type){

		case 'created':
			console.log('Created room '+msg.data.room+' my client ID is '+msg.data.clientId);
    		isInitiator = true;
    		grabCamVideo();
			break;

		case 'joined':
			console.log('One peer has joined room',msg.data.room,'with client ID',msg.data.clientId);
			grabCamVideo();
			break;

		case 'full':
			console.log('the room ',msg.data.room+' is full.We will create a new room for you');
			window.location.hash ='';
			window.location.reload();
			break;

		case 'log':
			//console.log.apply(console,msg.data.log);
			//console.log(msg.data.log);
			break;

		case 'ready':
			createPeerConnection();
			break;

		case 'candidate':
			console.log('candidate: ',msg.data.candidate);
    		peerConn.addIceCandidate(new RTCIceCandidate({
      			candidate:msg.data.candidate
    		}));
			break;

		case 'offer':
			console.log('Got offer.sending answer to peer.');
			peerConn.setRemoteDescription(new RTCSessionDescription(msg.data),function(){},logError);
			peerConn.createAnswer(function(desc){
				console.log('local session created:',desc)
				peerConn.setLocalDescription(desc,function(){
					console.log('sending local desc:',peerConn.localDescription);
					connection.send(createMessage('answer',peerConn.localDescription));
				},logError);
			},
			logError);
			break;

		case 'answer':
			console.log('got answer');
	  		peerConn.setRemoteDescription(new RTCSessionDescription(msg.data),function(){
				  console.log('set remote description successfully');
			  },logError);
			break;
	}
};

connection.onopen = function(e){
	console.log("Connection established!");
	console.log('sending message:'+createMessage('create or join',{room:room}));
	connection.send(createMessage('create or join',{room:room}));
	console.log('sending complete.');
};

function grabCamVideo(){
  console.log('Getting user media.......');
  navigator.mediaDevices.getUserMedia({
    audio:false,
    video:true
  })
  .then(function(stream){
    console.log('got user media successfully');
		localstream = stream;
	//track = stream.getTracks[0];
    //localVideo.src = window.URL.createObjectURL(stream);
	if(!isInitiator){
		connection.send(createMessage('ready',{room:room}));
	}
  })
  .catch(function(e){
    console.log('getUserMedia error: ',e.name);
  });
}

var peerConn;
var dataChannel;

function createPeerConnection(){
  console.log('creating peer connection as initiator? ',isInitiator,'config: ',configuration);
  peerConn = new RTCPeerConnection(configuration);
  peerConn.addStream(localstream);
  peerConn.onicecandidate = function(event){
      console.log('icecandidate event: ',event);

      if(event.candidate){
        connection.send(createMessage('candidate',{
                    label:event.candidate.sdpMLineIndex,
                    id:event.candidate.sdpMid,
                    candidate:event.candidate.candidate}
                    ));
      }else{
        console.log('End of candidates.');
      }
  };

  peerConn.onaddstream = function(event){
	  console.log('onaddstream setting remoteVideos src');
	  //remoteVideo.src = window.URL.createObjectURL(event.stream);
		video.src = window.URL.createObjectURL(event.stream);
  };

  //use promise to rewrite below
  if(isInitiator){
    	peerConn.createOffer(function(desc){
        	console.log('local session created:',desc);
          	peerConn.setLocalDescription(desc,function(){
            	console.log('sending local desc:',peerConn.localDescription);
            	connection.send(createMessage('offer',peerConn.localDescription));
          },logError);
        },
        logError,{
			mandatory:{
				OfferToReceiveAudio: true,
    		OfferToReceiveVideo: true
			}
		});
  }
  //peerConn.addstream(localStream);
  //peerConn.addTrack(track,localstream);
}

function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

function logError(err) {
  console.log(err.toString(), err);
}