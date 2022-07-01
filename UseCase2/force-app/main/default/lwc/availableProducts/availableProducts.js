import { LightningElement, api, wire } from 'lwc';
import getAvailableProducts from '@salesforce/apex/OrderController.getAvailableProducts';
import updateOrderItems from '@salesforce/apex/OrderController.updateOrderItems';
import LIST_PRICE from '@salesforce/schema/PricebookEntry.UnitPrice';

import { publish, MessageContext } from 'lightning/messageService';
import QUANTITY_UPDATED_CHANNEL from '@salesforce/messageChannel/Quantity_Updated__c';


export default class AvailableProducts extends LightningElement {
    @api recordId;
    @api pageSize = 5;
    pageNumber = 1;

    isPrev;
    isNext;

    totalPages;
    totalPricebookEntries;
    pbeRecordStart;
    pbeRecordEnd;
    /*@wire(getAvailableProducts, { orderId: this.recordId })
    orderDataWrapper({ error, data}) {
        if(data){
            this.processData(data);
        }else if(error){

        }
    }*/
    
    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.getData();
    }
    
    getData(){
        getAvailableProducts({ orderId: this.recordId, pageSize: this.pageSize, pageNumber: this.pageNumber })
        .then((result)=>{
            this.processData(result);
            this.isLoading = false;
        })
        .catch((error)=>{

        })
    }

    isLoading = false;

    availablePricebookEntries;
    
    columns = [
        { label: 'Product Name', fieldName: 'productName', type: 'text', sortable: true },
        { label: 'List Price', fieldName: LIST_PRICE.fieldApiName, type: 'currency', sortable: true },
        {
            label: '',
            type: 'button-icon',
            initialWidth: 50,
            typeAttributes: {
                iconName: 'utility:dash',
                title: 'Remove',
                variant: 'container',
                alternativeText: 'Remove',
                class : {fieldName : 'removeButtonClass'},
                disabled : {fieldName : 'disabled'}
            },
            
          },
          { label: '', fieldName: 'quantity', type: 'number' ,initialWidth: 50,
          typeAttributes: {class : {fieldName : 'quantityClass'}},
          cellAttributes: { alignment: 'center' }, sortable: true},
        {
            label: '',
            type: 'button-icon',
            initialWidth: 50,
            typeAttributes: {
                iconName: 'utility:add',
                title: 'Add',
                variant: 'container',
                alternativeText: 'Add',
                disabled : {fieldName : 'disabled'}
            }
          }
    ];
    sortedBy='quantity';
    sortedDirection = 'DESC';

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

    processData(data){
        this.totalPricebookEntries = data.totalPricebookEntries;
            this.pbeRecordStart = data.pbeRecordStart;
            this.pbeRecordEnd = data.pbeRecordEnd;
            this.totalPages = Math.ceil(data.totalPricebookEntries / this.pageSize);
            this.isNext = (this.pageNumber == this.totalPages || this.totalPages == 0);
                this.isPrev = (this.pageNumber == 1 || this.totalPricebookEntries < this.pageSize);
        this.availablePricebookEntries = data.pricebookEntries.map(obj=>{
            let quantity = 0;
            let alreadyExists = false;
            let quantityClass = 'slds-hide';
            let removeButtonClass = 'slds-hide';
            let orderItemId = '';
            if(data.orderRecord.OrderItems && data.orderRecord.OrderItems.length > 0){
                let existingOrderItem = data.orderRecord.OrderItems.find(item=>item.PricebookEntryId == obj.Id);
                if(existingOrderItem){
                    alreadyExists = true;
                    quantity = existingOrderItem.Quantity;
                    quantityClass = 'slds-show';
                    removeButtonClass = 'slds-show';
                    orderItemId = existingOrderItem.Id;
                }
            }
            return {...obj, productName : obj.Product2.Name, quantityClass: quantityClass, removeButtonClass: removeButtonClass, 
                quantity: quantity, alreadyExists: alreadyExists, orderItemId: orderItemId, disabled: data.orderRecord.Status == 'Activated' ? true : false };
        });
        this.sortData('quantity','DESC');
    }

    handleRowAction(event){
        this.isLoading = true;
        const actionName = event.detail.action.title;
        const row = event.detail.row;
        switch (actionName) {
            case 'Add':
                this.handleAddItem(row);
                //this.sortData('quantity','DESC');
                break;
            case 'Remove':
                this.handleRemoveItem(row);
                //this.sortData('quantity','DESC');
                break;
            default:
        }
    }

    handleAddItem(row){
        let entries = [...this.availablePricebookEntries];
        let rowData = entries.find(obj=> obj.Id == row.Id);
        rowData.quantity = Number(rowData.quantity) + 1;
        rowData.removeButtonClass = 'slds-show';
        rowData.quantityClass = 'slds-show';
        let orderItem = {};
        if(rowData.orderItemId){
            orderItem.Id = rowData.orderItemId;
        }
        else{
            orderItem.OrderId = this.recordId;
            orderItem.Product2Id = rowData.Product2Id;
            orderItem.PricebookEntryId = rowData.Id;
            orderItem.UnitPrice = rowData.UnitPrice;
        }
        orderItem.Quantity = rowData.quantity;
        updateOrderItems({orderId: this.recordId, orderItemRecord: orderItem, pageSize: this.pageSize, pageNumber: this.pageNumber})
        .then((result)=>{
            const payload = { 
                orderId: this.recordId
              };
              publish(this.messageContext, QUANTITY_UPDATED_CHANNEL, payload);
            this.processData(result);
            this.isLoading = false;
        })
        .catch((error)=>{
            this.isLoading = false;
        })
        //this.availablePricebookEntries = entries;
    }

    handleRemoveItem(row){
        let availableEntries = [...this.availablePricebookEntries];
        let existingRowData = availableEntries.find(obj=> obj.Id == row.Id);
        existingRowData.quantity = Number(existingRowData.quantity) - 1;
        existingRowData.removeButtonClass = existingRowData.quantity < 1 ? 'slds-hide' : 'slds-show';
        existingRowData.quantityClass = existingRowData.quantity < 1 ? 'slds-hide' : 'slds-show';
        let orderItem = {};
        if(existingRowData.orderItemId){
            orderItem.Id = existingRowData.orderItemId;
        }
        else{
            orderItem.OrderId = this.recordId;
            orderItem.Product2Id = existingRowData.Product2Id;
            orderItem.PricebookEntryId = existingRowData.Id;
            orderItem.UnitPrice = existingRowData.UnitPrice;
        }
        orderItem.Quantity = existingRowData.quantity;
        updateOrderItems({orderId: this.recordId, orderItemRecord: orderItem, pageSize: this.pageSize, pageNumber: this.pageNumber})
        .then((result)=>{
            const payload = { 
                orderId: this.recordId
              };
            publish(this.messageContext, QUANTITY_UPDATED_CHANNEL, payload);
            this.processData(result);
            this.isLoading = false;
              
        })
        .catch((error)=>{
            this.isLoading = false;
        })
        
        //this.availablePricebookEntries = availableEntries;
    }

    onSort(event) {
        this.sortedBy = event.detail.fieldName;
        this.sortedDirection = event.detail.sortDirection;
        this.sortData(this.sortedBy, this.sortedDirection);
      }
    
      sortData(fieldname, direction) {
        let parseData = JSON.parse(JSON.stringify(this.availablePricebookEntries));
        let keyValue = (a) => {
          return a[fieldname];
        };
        let isReverse = direction === "asc" ? 1 : -1;
        parseData.sort((x, y) => {
          x = keyValue(x) ? keyValue(x) : "";
          y = keyValue(y) ? keyValue(y) : "";
          return isReverse * ((x > y) - (y > x));
        });
        this.availablePricebookEntries = parseData;
      }
}