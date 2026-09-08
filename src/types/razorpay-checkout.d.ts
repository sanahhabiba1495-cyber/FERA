export {};

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: {
    email?: string;
    name?: string;
    contact?: string;
  };
  handler: () => void;
};

type RazorpayCheckoutInstance = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}
