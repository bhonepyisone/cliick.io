"use strict";
// This file was incorrectly implemented as a service. It has been replaced with proper type definitions.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = exports.PersistentMenuItemType = exports.MessageSender = exports.OrderStatus = exports.FormFieldType = exports.ModelType = void 0;
// AI Config
var ModelType;
(function (ModelType) {
    ModelType["FAST"] = "FAST";
    ModelType["STANDARD"] = "STANDARD";
    ModelType["THINKING"] = "THINKING";
})(ModelType || (exports.ModelType = ModelType = {}));
var FormFieldType;
(function (FormFieldType) {
    FormFieldType["SHORT_TEXT"] = "Short Text";
    FormFieldType["TEXT_AREA"] = "Text Area";
    FormFieldType["NUMBER"] = "Number";
    FormFieldType["EMAIL"] = "Email";
    FormFieldType["PHONE"] = "Phone";
    FormFieldType["DATE"] = "Date";
    FormFieldType["DROPDOWN"] = "Dropdown";
    FormFieldType["MULTIPLE_CHOICE"] = "Multiple Choice";
    FormFieldType["CHECKBOX"] = "Checkbox";
    FormFieldType["ITEM_SELECTOR"] = "Item Selector";
    FormFieldType["PAYMENT_SELECTOR"] = "Payment Selector";
})(FormFieldType || (exports.FormFieldType = FormFieldType = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Pending"] = "Pending";
    OrderStatus["Confirmed"] = "Confirmed";
    OrderStatus["Completed"] = "Completed";
    OrderStatus["Cancelled"] = "Cancelled";
    OrderStatus["Return"] = "Return";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
// Chat & Messaging
var MessageSender;
(function (MessageSender) {
    MessageSender["USER"] = "user";
    MessageSender["BOT"] = "bot";
})(MessageSender || (exports.MessageSender = MessageSender = {}));
var PersistentMenuItemType;
(function (PersistentMenuItemType) {
    PersistentMenuItemType["POSTBACK"] = "postback";
    PersistentMenuItemType["WEB_URL"] = "web_url";
    PersistentMenuItemType["OPEN_FORM"] = "open_form";
})(PersistentMenuItemType || (exports.PersistentMenuItemType = PersistentMenuItemType = {}));
var Role;
(function (Role) {
    Role["OWNER"] = "Owner";
    Role["ADMIN"] = "Admin";
    Role["ORDER_MANAGER"] = "Order Manager";
    Role["SUPPORT_AGENT"] = "Support Agent";
})(Role || (exports.Role = Role = {}));
