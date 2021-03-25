import { LightningElement } from 'lwc';
import getUsers from "@salesforce/apex/RTCContorller.getUsers"
import createConnection from "@salesforce/apex/RTCContorller.createConnection"
import setAnswer from "@salesforce/apex/RTCContorller.setAnswer"
import getConnection from "@salesforce/apex/RTCContorller.getConnection"
import getUserConnections from "@salesforce/apex/RTCContorller.getUserConnections"
import deleteConnection from "@salesforce/apex/RTCContorller.deleteConnection"
import RTC from '@salesforce/resourceUrl/RTC';
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class RtcDialog extends LightningElement {
	users = [];
	userId;
	connections = [];
	mute;
	connectedCallback() {
		this.initData();
	}

	async initData() {
		const listener = async (event) => {
			const { type, data } = event.data;
			await this.handleMessage(type, data);
		}
		addEventListener("message", listener, false);
		this.users = await getUsers();
		this.connections = await getUserConnections();
	}

	async waitForAnswer(connectionId, callback, counter) {
		if (!counter) {
			counter = 0;
		}

		try {
			const { Answer__c } = await getConnection({connectionId});
			if (Answer__c) {
				callback(Answer__c);
			} else {
				setTimeout(() => this.waitForAnswer(connectionId, callback, counter), 10000);
			}

		} catch (e) {
			callback(null);
		}
		if (counter > 20) {
			callback(null);
		}
	}

	async handleMessage(type, data) {
		switch (type) {
			case "createConnection": {
				const connectId = await createConnection({ offer: data, userId: this.userId });
				this.showToast('Connection created. Waiting for reply...', 'info');
				await this.waitForAnswer(connectId, (answer) =>{
					if (!answer) {
						this.showToast('The Responder did not answer!', 'info');
						return;
					}
					this.sendMessage('handleAnswer', answer);
				});
				break;
			}
			case "setAnswer": {
				await setAnswer({ connectionId: data.connectionId, answer: data.answer });
				this.showToast("Set Answer. Waiting for peer's connection...", 'info');
				break;
			}
			case 'connected':
				this.showToast('You are connected with responder.');
				break;
			case "error": {
				this.showToast(data, "error");
				break;
			}
		}
	}

	createOffer() {
		if (this.userId) {
			this.showToast('Creating connection.  This may take ~20 seconds.', 'info');
		} else {
			this.showToast('Select a Peer to Connect to...', 'warning');
		}
		this.sendMessage('createOffer');
	}

	showToast(message, variant) {
		const toast = new ShowToastEvent({ title: null, message, messageData: null, mode: "sticky", variant: variant || "success" });
		this.dispatchEvent(toast);
	}

	selectUser(event) {
		this.userId = event.detail.value;
	}

	get options() {
		return this.users.map(user => {
			return { label: user.Name, value: user.Id };
		})
	}
	get localVideoUrl() {
		return RTC + "/video.html?SFDCIFrameOrigin=" + window.location.origin;
	}

	get disableConnection() {
		return !this.userId;
	}

	get connectionData() {
		return this.connections.map(connection => {
			return { id: connection.Id, name: connection.Name, status: connection.Answer__c ? 'Old' : 'New' };
		});
	}

	get columns() {
		const actions = [
			{ label: 'Connect', name: 'connect' },
			{ label: 'Delete', name: 'delete' }
		];

		return [
			{ label: 'Name', fieldName: 'name' },
			{ label: 'Status', fieldName: 'status' },
			{
				type: 'action',
				typeAttributes: { rowActions: actions },
			},
		];
	}

	sendMessage(type, data) {
		const { contentWindow, src } = this.template.querySelector('[data-id="video"]') || {};
		if (contentWindow) {
			const frameUrl = new URL(src);
			contentWindow.postMessage({ type, data }, frameUrl.origin);
		}
	};

	async refresh() {
		this.connections = await getUserConnections();
	}

	onmute() {
		this.mute = !this.mute;
		this.sendMessage("mute", !this.mute);
	}

	cancelCall() {
		this.sendMessage("cancel");
	}

	async rowAction(event) {
		const actionName = event.detail.action.name;
		const row = event.detail.row;
		switch (actionName) {
			case 'delete':
				await deleteConnection({ connectionId: row.id });
				this.showToast('Connection has been deleted');
				await this.refresh();
				break;
			case 'connect':
				getConnection({ connectionId: row.id }).then(connection => {
					this.sendMessage("connect", { connectionId: row.id, connectionData: connection.Offer__c });
				});
				break;
			default:
		}
	}
}
