// Utility to map attendance streak to an image asset
export function getAttendanceImage(days: number) {
  if (days >= 91) return require('../../../assets/images/fw.png');
  if (days >= 61) return require('../../../assets/images/four-image.png');
  if (days >= 31) return require('../../../assets/images/third-image.png');
  if (days >= 11) return require('../../../assets/images/second-image.png');
  return require('../../../assets/images/first_image.png');
}

