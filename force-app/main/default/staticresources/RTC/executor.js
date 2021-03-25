let pc;
let getMedia;
const sendMessage = (type, data) => {
	const url = new URL(window.location.href);
	parent.postMessage({ type, data }, url.searchParams.get("SFDCIFrameOrigin"));
};

const listener = (event) => {
	const { type, data } = event && event.data;
	switch (type) {
		case "handleAnswer": {
			const answer = `${data}\r\n`
			const desc = new RTCSessionDescription({ type:"answer", sdp:answer })
			pc.setRemoteDescription(desc)
				.then(x => sendMessage('connected'))
				.catch(error => sendMessage('error', error))
			break;
		}
		case "connect": {
			const desc = new RTCSessionDescription({ type: "offer", sdp: `${data.connectionData}\r\n` });
			pc.setRemoteDescription(desc)
				.then(() => pc.createAnswer()).then(d => pc.setLocalDescription(d))
				.catch(error => sendMessage('error', error));
			pc.onicecandidate = e => {
				if (e.candidate){
					return
				}
				sendMessage("setAnswer", { connectionId: data.connectionId, answer: pc.localDescription.sdp });
			}
			break;
		}
		case "createOffer": {
			getMedia.then(() => pc.createOffer())
				.then(d => pc.setLocalDescription(d))
				.catch(error => sendMessage('error', error));
			break;
		}
		case "mute": {
			const localVideo = document.getElementById('localVideo');
			localVideo.srcObject.getAudioTracks()[0].enabled = data;
			break;
		}
		case "cancel": {
			pc.close();
			const localVideo = document.getElementById('localVideo');
			for (let track of localVideo.srcObject.getTracks()) {
				track.stop();
			}

			break;
		}
	}
};

document.addEventListener("DOMContentLoaded", () => {
	if (window.addEventListener) {
		addEventListener("message", listener, false);
	} else {
		console.error("addEventListener is not supported.");
	}
	const localVideo = document.getElementById('localVideo');
	const remoteVideo = document.getElementById('remoteVideo');
	const server = { urls: "stun:stun.l.google.com:19302" };
	pc = new RTCPeerConnection({ iceServers: [server] });

	pc.onaddstream = e => {
		debugger;
		remoteVideo.srcObject = e.stream
		localVideo.classList.add('hide');
		remoteVideo.classList.remove('hide');
		localVideo.classList.add('connected');
		localVideo.classList.remove('hide');
	}
	pc.oniceconnectionstatechange = e => console.log(pc.iceConnectionState)
	pc.onicecandidate = e => {
		if(e.candidate){
			return
		}
		sendMessage("createConnection", pc.localDescription.sdp);
	}
	getMedia = navigator.mediaDevices.getUserMedia({video:true, audio:true})
		.then(stream => pc.addStream(localVideo.srcObject = stream))
		.catch(e => sendMessage('error', e));

	// getMedia = navigator.mediaDevices.getDisplayMedia({video:true, audio:true})
	// 	.then(stream => pc.addStream(localVideo.srcObject = stream))
	// 	.catch(e => sendMessage('error', e));
});
