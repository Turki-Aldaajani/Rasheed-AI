/**
 * بيانات المنزل والطقس — نموذج تجريبي.
 * لاحقًا: تُستبدل بمخرجات Gemini Vision + واجهة الطقس المحلية.
 */

export type Household = {
  city: string;
  region: string;
  houseType: string;
  residents: number;
  acUnits: number;
  billingDays: number;
};

export type Weather = {
  temperatureC: number;
  humidity: number;
  condition: string;
  /** متوسط درجة الحرارة خلال فترة الفوترة */
  periodAverageC: number;
};

export const household: Household = {
  city: "الرياض",
  region: "منطقة الرياض",
  houseType: "فيلا",
  residents: 6,
  acUnits: 5,
  billingDays: 30,
};

export const weather: Weather = {
  temperatureC: 43,
  humidity: 22,
  condition: "حار جدًا",
  periodAverageC: 41,
};
