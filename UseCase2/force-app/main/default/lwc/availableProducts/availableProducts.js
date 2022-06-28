import { LightningElement, api, wire } from 'lwc';
import getAvailableProducts from '@salesforce/apex/OrderController.getAvailableProducts';

export default class AvailableProducts extends LightningElement {
    @api recordId;
    @wire(getAvailableProducts, { orderId: '$recordId' })
    orderDataWrapper;
}