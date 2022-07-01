public without sharing class OrderController {
    
    @AuraEnabled
    public static OrderDataWrapper getAvailableProducts(Id orderId, Integer pageSize, Integer pageNumber) {
        return new OrderDataWrapper(orderId, pageSize, pageNumber);
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
    public static OrderDataWrapper updateOrderItems(Id orderId, OrderItem orderItemRecord, Integer pageSize, Integer pageNumber){
        try {
            if(orderItemRecord.Quantity < 1 && String.isNotBlank(orderItemRecord.Id))
                delete orderItemRecord;
            else
                upsert orderItemRecord;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return new OrderDataWrapper(orderId, pageSize, pageNumber);
    }

    public class OrderDataWrapper{

        public Id orderId;

        public OrderDataWrapper(Id orderId, Integer pageSize, Integer pageNumber) {
            this.orderId = orderId;
            this.pageSize = pageSize;
            this.pageNumber = pageNumber;
        }

        @AuraEnabled
        public Order orderRecord{
            get{
                return [Select Id, Status, ContractId, (SELECT Id, Product2Id, Product2.Name, Quantity, AvailableQuantity, PricebookEntryId, UnitPrice, ListPrice, TotalPrice, OrderId FROM OrderItems) from Order where Id=:orderId];
            }
            set{}
        }
        
        @AuraEnabled public Integer offset {
            get{
                return (pageNumber - 1) * pageSize;
            }set;
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
                return [SELECT Id, Product2Id, Product2.Name, UnitPrice, IsActive, ProductCode, Pricebook2Id, Name FROM PricebookEntry where Pricebook2Id=:contractRecord.PriceBook2Id LIMIT :pageSize OFFSET :offset];
            }
            set{}
        }

        @AuraEnabled
        public List<OrderItem> orderItems{
            get{
                return [SELECT Id, Product2Id, Product2.Name, Quantity, AvailableQuantity, PricebookEntryId, UnitPrice, ListPrice, TotalPrice, OrderId FROM OrderItem where OrderId=:orderId LIMIT :pageSize OFFSET :offset];
            }
            set{}
        }

        @AuraEnabled public Integer pageSize {get;set;}
        @AuraEnabled public Integer pageNumber {get;set;}
        @AuraEnabled public Integer totalOrderItems {
            get{
                return [Select COUNT() from OrderItem where OrderId =:orderId];
            }
            set;
        }
        @AuraEnabled public Integer totalPricebookEntries {
            get{
                return [Select COUNT() from PricebookEntry where Pricebook2Id=:contractRecord.PriceBook2Id];
            }
            set;
        }

        @AuraEnabled public Integer recordEnd {
            get{
                return pageSize * pageNumber;
            }
            set;
        }

        @AuraEnabled public Integer oliRecordStart {
            get{
                return offset + 1;
            }
            set;
        }
        @AuraEnabled public Integer oliRecordEnd {
            get{
                return totalOrderItems >= recordEnd ? recordEnd : totalOrderItems;
            }
            set;
        }
        @AuraEnabled public Integer pbeRecordStart {
            get{
                return offset + 1;
            }
            set;
        }
        @AuraEnabled public Integer pbeRecordEnd {
            get{
                return totalPricebookEntries >= recordEnd ? recordEnd : totalPricebookEntries;
            }
            set;
        }

    
    }
}