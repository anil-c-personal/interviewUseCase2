public with sharing class OrderConfirmationRequestWrapper {
    public OrderConfirmationRequestWrapper() {

    }

    @AuraEnabled public String accountNumber;
    @AuraEnabled public String orderNumber;
    @AuraEnabled public String type;
    @AuraEnabled public String status;
    @AuraEnabled public List<OrderProduct> orderProducts;

    public class OrderProduct{
        @AuraEnabled public String name;
        @AuraEnabled public String code;
        @AuraEnabled public Decimal unitPrice;
        @AuraEnabled public Decimal quantity;
    }
}
