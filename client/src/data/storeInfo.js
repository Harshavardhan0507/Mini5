/**
 * Business details shown on the storefront, checkout and invoices.
 * Fill in the blank fields before going live — nothing here is invented,
 * empty values are simply omitted from the pages.
 */
export const STORE_INFO = {
  brand: 'KisanAgro',
  legalName: 'KisanAgro Agro Store',
  email: 'business615@gmail.com',
  phone: '',
  address: 'Dhone, Andhra Pradesh, India',
  supportHours: 'Monday to Saturday, 9:00 AM to 6:00 PM IST',
  deliveryArea: 'Andhra Pradesh and Telangana',
  deliveryTime: '2 to 5 business days',
  returnsWindowDays: 3,
  freeDeliveryNote: 'Free delivery on every order.',

  // Add these before launch so they appear on invoices and policy pages
  upiId: '',
  gstin: '',
  fertilizerLicense: '',
  insecticideLicense: ''
};

export const STORE_CONTACT = {
  email: STORE_INFO.email,
  phone: STORE_INFO.phone,
  address: STORE_INFO.address,
  hours: STORE_INFO.supportHours
};
