import { LightningElement, api, wire } from 'lwc';
import getAvailableProducts from '@salesforce/apex/OrderController.getAvailableProducts';
import { updateRecord } from 'lightning/uiRecordApi';
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

    @api pageSize = 5;
    pageNumber = 1;
    totalOrderItems;
    oliRecordStart;
    oliRecordEnd;
    totalPages;
    isNext;
    isPrev;

    connectedCallback() {
        this.subscribeToMessageChannel();
        this.getData();
    }

    handleNext(){
        this.isLoading = true;
        this.pageNumber = this.pageNumber+1;
        this.getData();
    }
 
    handlePrev(){
        this.isLoading = true;
        this.pageNumber = this.pageNumber-1;
        this.getData();
    }

      getData(){
        getAvailableProducts({ orderId: this.recordId, pageSize: this.pageSize, pageNumber: this.pageNumber })
        .then((result)=>{
            if(result.orderRecord.Status == 'Draft'){
                this.showActivateButton = true;
            }else{
                this.showActivatedMessage = true;
            }
            this.orderProducts = result.orderItems.map(obj=>{
                return {...obj, productName : obj.Product2.Name };
            });

            this.totalOrderItems = result.totalOrderItems;
            this.oliRecordStart = result.oliRecordStart;
            this.oliRecordEnd = result.oliRecordEnd;
            this.totalPages = Math.ceil(result.totalOrderItems / this.pageSize);
            this.isNext = (this.pageNumber == this.totalPages || this.totalPages == 0);
            this.isPrev = (this.pageNumber == 1 || this.totalOrderItems < this.pageSize);


            this.isLoading = false;
        })
        .catch((error)=>{
            
        })
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
            this.getData();
            /*getAvailableProducts({orderId: orderId, pageSize: this.pageSize, pageNumber: this.pageNumber})
            .then((result)=>{
                this.orderProducts = result.orderItems.map(obj=>{
                    return {...obj, productName : obj.Product2.Name };
                });
                this.isLoading = false;
            })
            .catch((error)=>{

            })*/
        }
      }

    /*@wire(getAvailableProducts, { orderId: this.recordId })
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
    }*/
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
            updateRecord({ fields: { Id: this.recordId }})
        })
        .catch((error)=>{

        })
      }
}