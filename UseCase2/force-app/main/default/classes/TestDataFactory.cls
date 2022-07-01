public class TestDataFactory {
    public static Account createAccount(){
		return new Account(Name='Test Account');
    }
    
    public static Contract createContract(String accountId){
        return new Contract(AccountId = accountId, Pricebook2Id = Test.getStandardPricebookId());
    }
    
    public static Order createOrder(String accountId, String contractId){
        return new Order(AccountId = accountId, ContractId = contractId, Pricebook2Id = Test.getStandardPricebookId(), EffectiveDate = System.today(), Status = 'Draft');
    }
    
    public static Product2 createProduct(){
        return new Product2(Name = 'Test Product', isActive = true, ProductCode = 'ABC');
    }
    
    public static PricebookEntry createPricebookEntry(String productId){
        return new PricebookEntry(Pricebook2Id = Test.getStandardPricebookId(), Product2Id = productId, UnitPrice = 10000);
    }
    
	public static OrderItem createOrderItem(String orderId, String productId, String pbeId){
        return new OrderItem(OrderId = orderId, Product2Id = productId, PricebookEntryId = pbeId, Quantity = 10, UnitPrice = 10000);
    }    
}