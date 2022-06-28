import { LightningElement, api, wire } from 'lwc';
import getAvailableProducts from '@salesforce/apex/OrderController.getAvailableProducts';

export default class OrderProducts extends LightningElement {
    @api recordId;
    @wire(getAvailableProducts, { orderId: '$recordId' })
    orderDataWrapper({ error, data}) {
        if(data){
            this.orderProducts = data.orderRecord.OrderItems.map(obj=>{
                return {...obj, productName : obj.Product2.Name };
            });
        }else if(error){

        }
    }
    columns = [
        { label: 'Product Name', fieldName: 'productName', type: 'text' },
        { label: 'Unit Price', fieldName: 'UnitPrice', type: 'currency' },
        { label: 'Quantity', fieldName: 'Quantity', type: 'number' },
        { label: 'Total Price', fieldName: 'TotalPrice', type: 'currency' }
    ];
    orderProducts;
    sortedBy='Quantity';
    sortedDirection = 'DESC';

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

}