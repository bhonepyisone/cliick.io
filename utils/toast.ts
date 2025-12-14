import toast from 'react-hot-toast';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      position: 'top-right',
      duration: 3000,
    });
  },
  
  error: (message: string) => {
    toast.error(message, {
      position: 'top-right',
      duration: 5000,
    });
  },
  
  info: (message: string) => {
    toast(message, {
      position: 'top-right',
      duration: 4000,
    });
  },
  
  warning: (message: string) => {
    toast(message, {
      position: 'top-right',
      duration: 4000,
      icon: '⚠️',
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
    });
  },
  
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }
};

// Database operation specific toast helpers
export const dbToast = {
  saveError: (entity: string, error: any) => {
    const message = error instanceof Error ? error.message : String(error);
    showToast.error(`Failed to save ${entity} to database: ${message}`);
  },
  
  updateError: (entity: string, error: any) => {
    const message = error instanceof Error ? error.message : String(error);
    showToast.error(`Failed to update ${entity} in database: ${message}`);
  },
  
  loadError: (entity: string, error: any) => {
    const message = error instanceof Error ? error.message : String(error);
    showToast.error(`Failed to load ${entity} from database: ${message}`);
  },
  
  deleteError: (entity: string, error: any) => {
    const message = error instanceof Error ? error.message : String(error);
    showToast.error(`Failed to delete ${entity} from database: ${message}`);
  }
};