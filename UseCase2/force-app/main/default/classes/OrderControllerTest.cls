@isTest
public class OrderControllerTest {
	@TestSetup
    public static void createTestData(){
        Account accountRecord = TestDataFactory.createAccount();
        insert accountRecord;
        
        Contract contractRecord = TestDataFactory.createContract(accountRecord.Id);
        insert contractRecord;
        
        Order orderRecord = TestDataFactory.createOrder(accountRecord.Id, contractRecord.Id);
        insert orderRecord;
        
        Product2 productRecord = TestDataFactory.createProduct();
        insert productRecord;
        
        PricebookEntry pbeRecord = TestDataFactory.createPricebookEntry(productRecord.Id);
        insert pbeRecord;
        
        OrderItem oliRecord = TestDataFactory.createOrderItem(orderRecord.Id, productRecord.Id, pbeRecord.Id);
        insert oliRecord;
    }
    
    @isTest
    public static void testOrderController(){
        Order orderRecord = [Select Id from Order limit 1];
        OrderItem orderItemRecord = [Select Id, Quantity from OrderItem where OrderId = :orderRecord.Id limit 1];
        OrderController.OrderDataWrapper wrapper = OrderController.getAvailableProducts(orderRecord.Id, 10, 1);
        
        System.assert(wrapper.orderRecord != null);
        System.assert(wrapper.offset == 0);
        System.assert(wrapper.contractRecord != null);
        System.assert(wrapper.pricebookEntries != null);
        System.assert(wrapper.orderItems != null);
        System.assert(wrapper.pageSize == 10);
        System.assert(wrapper.pageNumber == 1);
        System.assert(wrapper.totalOrderItems == 1);
        System.assert(wrapper.totalPricebookEntries == 1);
        System.assert(wrapper.recordEnd == 10);
        System.assert(wrapper.oliRecordStart == 1);
        System.assert(wrapper.oliRecordEnd == 1);
        System.assert(wrapper.pbeRecordStart == 1);
        System.assert(wrapper.pbeRecordEnd == 1);
        
            
        OrderController.updateOrderItems(orderRecord.Id, orderItemRecord, 10, 1);
        Test.setMock(HttpCalloutMock.class, new OrderConfirmationCalloutMock());
        
        Test.startTest();
        OrderController.activateOrder(orderRecord.Id);
        Test.stopTest();
        Order orderRecordUpdated = [Select Id, Status from Order limit 1];
        System.assert(orderRecordUpdated.Status == 'Activated');
    }
}