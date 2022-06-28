import { LightningElement, api, wire } from 'lwc';
import getAvailableProducts from '@salesforce/apex/OrderController.getAvailableProducts';
import UNIT_PRICE from '@salesforce/schema/PricebookEntry.UnitPrice';


export default class AvailableProducts extends LightningElement {
    @api recordId;
    @wire(getAvailableProducts, { orderId: '$recordId' })
    orderDataWrapper({ error, data}) {
        if(data){
            this.availablePricebookEntries = data.pricebookEntries.map(obj=>{
                return {...obj, productName : obj.Product2.Name,quantityClass: 'slds-hide',removeButtonClass: 'slds-hide', quantity:0 };
            });
        }else if(error){

        }
    }
    availablePricebookEntries;
    columns = [
        { label: 'Product Name', fieldName: 'productName', type: 'text' },
        { label: 'Unit Price', fieldName: UNIT_PRICE.fieldApiName, type: 'currency' },
        {
            label: '',
            type: 'button-icon',
            initialWidth: 50,
            typeAttributes: {
                iconName: 'utility:dash',
                title: 'Remove',
                variant: 'container',
                alternativeText: 'Remove',
                class : {fieldName : 'removeButtonClass'}
            },
            
          },
          { label: '', fieldName: 'quantity', type: 'number' ,initialWidth: 50,
          typeAttributes: {class : {fieldName : 'quantityClass'}},
          cellAttributes: { alignment: 'center' }},
        {
            label: '',
            type: 'button-icon',
            initialWidth: 50,
            typeAttributes: {
                iconName: 'utility:add',
                title: 'Add',
                variant: 'container',
                alternativeText: 'Add'
            }
          }
    ];
    sortedBy='quantity';
    sortedDirection = 'DESC';
    handleRowAction(event){
        const actionName = event.detail.action.title;
        const row = event.detail.row;
        switch (actionName) {
            case 'Add':
                let entries = [...this.availablePricebookEntries];
                let rowData = entries.find(obj=> obj.Id == row.Id);
                rowData.quantity = Number(rowData.quantity) + 1;
                rowData.removeButtonClass = 'slds-show';
                rowData.quantityClass = 'slds-show';
                this.availablePricebookEntries = entries;
                this.sortData('quantity','DESC');
                break;
            case 'Remove':
                let availableEntries = [...this.availablePricebookEntries];
                let existingRowData = availableEntries.find(obj=> obj.Id == row.Id);
                existingRowData.quantity = Number(existingRowData.quantity) - 1;
                existingRowData.removeButtonClass = existingRowData.quantity < 1 ? 'slds-hide' : 'slds-show';
                existingRowData.quantityClass = existingRowData.quantity < 1 ? 'slds-hide' : 'slds-show';
                this.availablePricebookEntries = availableEntries;
                this.sortData('quantity','DESC');
                break;
            default:
        }
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