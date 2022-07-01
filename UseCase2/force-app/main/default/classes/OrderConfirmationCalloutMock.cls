@isTest
global class OrderConfirmationCalloutMock implements HttpCalloutMock{
    global HTTPResponse respond(HTTPRequest request) {
        HttpResponse response = new HttpResponse();
        //response.setHeader('Content-Type', 'application/json');
        response.setBody('request received');
        response.setStatusCode(200);
        return response; 
    }
}