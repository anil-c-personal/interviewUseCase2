public without sharing class OrderController {
    
    @AuraEnabled(cacheable=true)
    public static OrderDataWrapper getAvailableProducts(Id orderId) {
        return new OrderDataWrapper(orderId);
    }
    
    @AuraEnabled
    public static List<OrderItem> getOrderItems(Id orderId) {
        return [SELECT Id, Product2Id, Product2.Name, Quantity, AvailableQuantity, PricebookEntryId, UnitPrice, ListPrice, TotalPrice, OrderId FROM OrderItem where OrderId=:orderId];
    }

    @AuraEnabled
    public static List<OrderItem> getOrderItems1(Id orderId) {
        return [SELECT Id, Product2Id, Product2.Name, Quantity, AvailableQuantity, PricebookEntryId, UnitPrice, ListPrice, TotalPrice, OrderId FROM OrderItem where OrderId=:orderId];
    }

    @AuraEnabled
    public static void activateOrder(Id orderId) {
        Order orderRecord = [SELECT Id, ContractId, (Select Id, Status__c, Product2Id, Product2.Name, Quantity, AvailableQuantity, PricebookEntryId, UnitPrice, ListPrice, TotalPrice, OrderId FROM OrderItems) from Order where Id=:orderId];
        orderRecord.Status = 'Activated';
        Contract contractRecord = new Contract(Id=orderRecord.ContractId, Status = 'Activated');
        List<OrderItem> orderItems = new List<OrderItem>();
        for(OrderItem orderItem : orderRecord.OrderItems){
            orderItem.Status__c = 'Activated';
            orderItems.add(orderItem);
        }
        try{
            update contractRecord;
            update orderRecord;
            update orderItems;
            makeCallout(orderId);
        }catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }

    @future(callout=true)
    public static void makeCallout(String orderId){
        Order orderRecord = [SELECT Id, ContractId, Account.AccountNumber, OrderNumber, Type, Status, (Select Id, Status__c, Product2Id, Product2.Name, Product2.ProductCode, Quantity, AvailableQuantity, PricebookEntryId, UnitPrice, ListPrice, TotalPrice, OrderId FROM OrderItems) from Order where Id=:orderId];
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://usecase2.requestcatcher.com/test');
        request.setMethod('POST');
        OrderConfirmationRequestWrapper reqWrapper = new OrderConfirmationRequestWrapper();
        reqWrapper.accountNumber = String.isNotBlank(orderRecord.Account.AccountNumber) ? orderRecord.Account.AccountNumber : '';
        reqWrapper.orderNumber = String.isNotBlank(orderRecord.OrderNumber) ? orderRecord.OrderNumber : '';
        reqWrapper.type = String.isNotBlank(orderRecord.Type) ? orderRecord.Type : '';
        reqWrapper.status = String.isNotBlank(orderRecord.Status) ? orderRecord.Status : '';
        List<OrderConfirmationRequestWrapper.OrderProduct> orderProductList = new List<OrderConfirmationRequestWrapper.OrderProduct>();

        for(OrderItem orderItem : orderRecord.OrderItems){
            OrderConfirmationRequestWrapper.OrderProduct orderProduct = new OrderConfirmationRequestWrapper.OrderProduct();
            orderProduct.name = String.isNotBlank(orderItem.Product2.Name) ? orderItem.Product2.Name : '';
            orderProduct.code = String.isNotBlank(orderItem.Product2.ProductCode) ? orderItem.Product2.ProductCode : '';
            orderProduct.unitPrice = orderItem.UnitPrice != null ? orderItem.UnitPrice : null;
            orderProduct.quantity = orderItem.Quantity != null ? orderItem.Quantity : null;
            orderProductList.add(orderProduct);
        }

        reqWrapper.orderProducts = orderProductList;

        request.setBody(JSON.serialize(reqWrapper));

        HttpResponse response = http.send(request);
        if(response.getStatusCode()==200){
            System.debug('callout successful');
            System.debug(response.getBody());
            //do further processing with response body
        }else{
            throw new AuraHandledException('Unsuccessful response');
        }

    }

    @AuraEnabled
    public static OrderDataWrapper updateOrderItems(Id orderId, OrderItem orderItemRecord){
        try {
            if(orderItemRecord.Quantity < 1 && String.isNotBlank(orderItemRecord.Id))
                delete orderItemRecord;
            else
                upsert orderItemRecord;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return new OrderDataWrapper(orderId);
    }

    public class OrderDataWrapper{

        public Id orderId;

        public OrderDataWrapper(Id orderId) {
            this.orderId = orderId;
        }

        @AuraEnabled
        public Order orderRecord{
            get{
                return [Select Id, Status, ContractId, (SELECT Id, Product2Id, Product2.Name, Quantity, AvailableQuantity, PricebookEntryId, UnitPrice, ListPrice, TotalPrice, OrderId FROM OrderItems) from Order where Id=:orderId];
            }
            set{}
        }
        
        @AuraEnabled
        public Contract contractRecord{
            get{
                return [Select Id, PriceBook2Id from Contract where Id=:orderRecord.ContractId];
            }
            set{}
        }
        
        @AuraEnabled
        public List<PricebookEntry> pricebookEntries{
            get{
                return [SELECT Id, Product2Id, Product2.Name, UnitPrice, IsActive, ProductCode, Pricebook2Id, Name FROM PricebookEntry where Pricebook2Id=:contractRecord.PriceBook2Id];
            }
            set{}
        }
    }
}