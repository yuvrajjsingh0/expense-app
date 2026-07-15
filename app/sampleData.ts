// Seed alerts so the app is usable on first launch, before the user connects
// SMS, email, or an account. Spans two months across banks, channels, and
// categories, with recurring subscriptions to exercise every view.

export const SAMPLE_ALERTS: string[] = [
  "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 05-05-26",
  "Sent Rs.119.00 from Kotak Bank AC X1234 to spotify@ybl on 06-05-26. UPI Ref 510001",
  "Sent Rs.472.00 From HDFC Bank A/C x1234 To Swiggy Instamart On 09-05-26 Ref 510002 UPI",
  "INR 1299.00 spent on AXIS BANK Credit Card XX1234 at FLIPKART on 14-05-26",
  "Dear UPI user A/C X1234 debited by 538.0 on date 18May26 trf to ZOMATO Refno 510003",
  "Sent Rs.89.00 from Kotak Bank AC X1234 to rapido@axis on 22-05-26. UPI Ref 510004",
  "Spent Rs.2499.00 On HDFC Bank Card x5678 At AMAZON on 27-05-26. Avl Lmt Rs.50000",
  "Rs.55000.00 credited to A/C XX1234 on 31-05-26 by NEFT from ACME PVT LTD salary",
  "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 05-06-26",
  "Sent Rs.119.00 from Kotak Bank AC X1234 to spotify@ybl on 06-06-26. UPI Ref 610001",
  "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 08-06-26 Ref 610002 UPI",
  "ICICI Bank Acct XX567 debited for Rs 642.00 on 11-Jun-26; Blinkit credited. UPI:610003",
  "Sent Rs.330.00 From HDFC Bank A/C x1234 To Third Wave Coffee On 13-06-26 Ref 610004 UPI",
  "INR 899.00 spent on YES BANK Credit Card xx4321 at MYNTRA on 16-06-26",
  "Sent Rs.250.00 From HDFC Bank A/C x1234 To ZEPTO On 19-06-26 Ref 610005 UPI",
  "Spent Rs.1180.00 On HDFC Bank Card x5678 At APOLLO PHARMACY on 21-06-26",
  "Rs.799.00 spent on your RuPay Credit Card xx7788 at BIGBASKET on 23-06-26",
  "Sent Rs.149.00 From HDFC Bank A/C x1234 To IRCTC On 25-06-26 Ref 610006 UPI",
  "INR 1199.00 spent on IDFC FIRST Bank Credit Card XX3344 at NYKAA on 26-06-26",
  "Sent Rs.560.00 From HDFC Bank A/C x1234 To Uber On 27-06-26 Ref 610007 UPI",
];

/** Fixed reference so sample year inference is stable regardless of run date. */
export const SAMPLE_REFERENCE = new Date("2026-06-28T00:00:00Z");
