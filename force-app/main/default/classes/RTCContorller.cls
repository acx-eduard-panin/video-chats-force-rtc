public without sharing class RTCContorller {
	@AuraEnabled
	public static List<User> getUsers() {
		return [
				SELECT Id, Name, Email
				FROM User
				WHERE IsActive = TRUE
		]; // AND Id != :UserInfo.getUserId()
	}

	@AuraEnabled
	public static Id createConnection(String offer, String userId) {
		Connect__c conn = new Connect__c(
				Name = 'Conversation from ' + UserInfo.getUserName(),
				Offer__c = offer,
				Responder__c = userId,
				Initializer__c = UserInfo.getUserId()
		);

		insert conn;
		return conn.Id;
	}

	@AuraEnabled
	public static List<Connect__c> getUserConnections() {
		return [
				SELECT Id, Name, Answer__c, Offer__c, Initializer__c, Responder__c
				FROM Connect__c
				WHERE Responder__c =: UserInfo.getUserId()
				ORDER BY CreatedDate DESC
				LIMIT 20
		];
	}

	@AuraEnabled
	public static void deleteConnection(Id connectionId) {
		Database.delete(connectionId);
	}

	@AuraEnabled
	public static Connect__c getConnection(String connectionId) {
		return [
				SELECT Id, Name, Answer__c, Offer__c, Initializer__c, Responder__c
				FROM Connect__c
				WHERE Id = :connectionId
		];
	}

	@AuraEnabled
	public static void setAnswer(String connectionId, String answer) {
		update new Connect__c(Id = connectionId, Answer__c = answer);
	}
}
