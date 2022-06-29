import { LightningElement, api, wire } from 'lwc';
import getAvailableProducts from '@salesforce/apex/OrderController.getAvailableProducts';
import getOrderItems from '@salesforce/apex/OrderController.getOrderItems';
import activateOrderAndProducts from '@salesforce/apex/OrderController.activateOrder';
import { subscribe, MessageContext } from 'lightning/messageService';
import QUANTITY_UPDATED_CHANNEL from '@salesforce/messageChannel/Quantity_Updated__c';

export default class OrderProducts extends LightningElement {
    subscription = null;
    @wire(MessageContext)
    messageContext;
    @api recordId;
    showActivateButton = false;
    showActivatedMessage = false;
    isLoading = false;

    connectedCallback() {
        this.subscribeToMessageChannel();
      }

    subscribeToMessageChannel() {
        this.subscription = subscribe(
          this.messageContext,
          QUANTITY_UPDATED_CHANNEL,
          (message) => this.handleMessage(message)
        );
      }
      handleMessage(message) {
        this.isLoading = true;
        let orderId = message.orderId;
        if(orderId == this.recordId){
            getOrderItems({orderId: orderId})
            .then((result)=>{
                this.orderProducts = result.map(obj=>{
                    return {...obj, productName : obj.Product2.Name };
                });
                this.isLoading = false;
            })
            .catch((error)=>{

            })
        }
      }

    @wire(getAvailableProducts, { orderId: '$recordId' })
    orderDataWrapper({ error, data}) {
        if(data){
            if(data.orderRecord.Status == 'Draft'){
                this.showActivateButton = true;
            }else{
                this.showActivatedMessage = true;
            }
            this.orderProducts = data.orderRecord.OrderItems.map(obj=>{
                return {...obj, productName : obj.Product2.Name };
            });
        }else if(error){

        }
    }
    columns = [
        { label: 'Product Name', fieldName: 'productName', type: 'text', sortable: true },
        { label: 'Unit Price', fieldName: 'UnitPrice', type: 'currency', sortable: true },
        { label: 'Quantity', fieldName: 'Quantity', type: 'number', sortable: true },
        { label: 'Total Price', fieldName: 'TotalPrice', type: 'currency', sortable: true }
    ];
    orderProducts;
    sortedBy='Quantity';
    sortedDirection = 'DESC';

    onSort(event) {
        this.sortedBy = event.detail.fieldName;
        this.sortedDirection = event.detail.sortDirection;
        this.sortData(this.sortedBy, this.sortedDirection);
      }

    sortData(fieldname, direction) {
        let parseData = JSON.parse(JSON.stringify(this.orderProducts));
        let keyValue = (a) => {
          return a[fieldname];
        };
        let isReverse = direction === "asc" ? 1 : -1;
        parseData.sort((x, y) => {
          x = keyValue(x) ? keyValue(x) : "";
          y = keyValue(y) ? keyValue(y) : "";
          return isReverse * ((x > y) - (y > x));
        });
        this.orderProducts = parseData;
      }

      activateOrder(event){
        activateOrderAndProducts({orderId: this.recordId})
        .then((result)=>{
            this.showActivateButton = false;
            this.showActivatedMessage = true;
        })
        .catch((error)=>{

        })
      }
}