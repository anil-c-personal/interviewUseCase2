public without sharing class OrderController {
    
    @AuraEnabled(cacheable=true)
    public static OrderDataWrapper getAvailableProducts(Id orderId) {
        return new OrderDataWrapper(orderId);
    }
    
    @AuraEnabled
    public static OrderDataWrapper updateOrderItems(Id orderId, OrderItem orderItemRecord){
        try {
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
                return [Select Id, ContractId, (SELECT Id, Product2Id, Quantity, AvailableQuantity, PricebookEntryId, UnitPrice, ListPrice, TotalPrice, OrderId FROM OrderItems) from Order where Id=:orderId];
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