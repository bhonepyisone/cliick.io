"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbToast = exports.showToast = void 0;
const react_hot_toast_1 = require("react-hot-toast");
exports.showToast = {
    success: (message) => {
        react_hot_toast_1.default.success(message, {
            position: 'top-right',
            duration: 3000,
        });
    },
    error: (message) => {
        react_hot_toast_1.default.error(message, {
            position: 'top-right',
            duration: 5000,
        });
    },
    info: (message) => {
        (0, react_hot_toast_1.default)(message, {
            position: 'top-right',
            duration: 4000,
        });
    },
    warning: (message) => {
        (0, react_hot_toast_1.default)(message, {
            position: 'top-right',
            duration: 4000,
            icon: '⚠️',
        });
    },
    loading: (message) => {
        return react_hot_toast_1.default.loading(message, {
            position: 'top-right',
        });
    },
    dismiss: (toastId) => {
        if (toastId) {
            react_hot_toast_1.default.dismiss(toastId);
        }
        else {
            react_hot_toast_1.default.dismiss();
        }
    }
};
// Database operation specific toast helpers
exports.dbToast = {
    saveError: (entity, error) => {
        const message = error instanceof Error ? error.message : String(error);
        exports.showToast.error(`Failed to save ${entity} to database: ${message}`);
    },
    updateError: (entity, error) => {
        const message = error instanceof Error ? error.message : String(error);
        exports.showToast.error(`Failed to update ${entity} in database: ${message}`);
    },
    loadError: (entity, error) => {
        const message = error instanceof Error ? error.message : String(error);
        exports.showToast.error(`Failed to load ${entity} from database: ${message}`);
    },
    deleteError: (entity, error) => {
        const message = error instanceof Error ? error.message : String(error);
        exports.showToast.error(`Failed to delete ${entity} from database: ${message}`);
    }
};
