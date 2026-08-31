import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReceiptData } from '../types';

/**
 * Downloads a digital fee receipt as an official A4 PDF document.
 * @param receipt The verified receipt data
 * @param elementId The DOM element ID to capture (defaults to 'printable-receipt-card')
 */
export async function downloadReceiptAsPdf(
  receipt: ReceiptData,
  elementId: string = 'printable-receipt-card'
): Promise<void> {
  const fileName = `Fee_Receipt_${receipt.receiptNumber}.pdf`;

  try {
    const receiptElement = document.getElementById(elementId);

    if (receiptElement) {
      // 1. High-DPI DOM Canvas Render for visual perfection
      const canvas = await html2canvas(receiptElement, {
        scale: 2.5, // 2.5x scale for sharp text and crisp lines
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Margin calculations
      const margin = 10; // 10mm margins
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pdfHeight - margin * 2) {
        // Fits on single A4 page
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
      } else {
        // Multi-page handling
        let heightLeft = contentHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - contentHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
          heightLeft -= pdfHeight;
        }
      }

      pdf.save(fileName);
      return;
    }
  } catch (canvasErr) {
    console.warn('html2canvas render failed, falling back to programmatic jsPDF renderer:', canvasErr);
  }

  // Fallback: Programmatic Native jsPDF Vector Document Generation
  generateNativeReceiptPdf(receipt, fileName);
}

/**
 * Fallback native PDF generator creating an official college receipt layout directly.
 */
export function generateNativeReceiptPdf(receipt: ReceiptData, fileName?: string): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const targetFileName = fileName || `Fee_Receipt_${receipt.receiptNumber}.pdf`;
  const pageWidth = 210;
  let y = 15;

  // Header Background bar
  pdf.setFillColor(30, 41, 59); // slate-800
  pdf.rect(10, y, pageWidth - 20, 24, 'F');

  // College Name & Header
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(receipt.college.name, pageWidth / 2, y + 8, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.college.affiliation, pageWidth / 2, y + 14, { align: 'center' });
  pdf.text(`${receipt.college.address} | ${receipt.college.contact}`, pageWidth / 2, y + 19, { align: 'center' });

  y += 28;

  // Title Banner
  pdf.setFillColor(241, 245, 249); // slate-100
  pdf.setDrawColor(203, 213, 225); // slate-300
  pdf.roundedRect(10, y, pageWidth - 20, 14, 2, 2, 'FD');

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('OFFICIAL FEE PAYMENT RECEIPT', 15, y + 6);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Receipt No: ${receipt.receiptNumber}`, 15, y + 10.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(5, 150, 105); // emerald-600
  pdf.text('PAYMENT VERIFIED & SETTLED', pageWidth - 15, y + 6, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Date: ${new Date(receipt.transactionDate).toLocaleString('en-IN')}`, pageWidth - 15, y + 10.5, { align: 'right' });

  y += 18;

  // Student Information Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(10, y, pageWidth - 20, 36, 2, 2, 'FD');

  pdf.setTextColor(79, 70, 229); // indigo-600
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('STUDENT PROFILE & ACADEMIC REGISTRATION', 15, y + 6);

  pdf.setTextColor(51, 65, 85);
  pdf.setFontSize(8);

  // Col 1
  pdf.setFont('helvetica', 'bold');
  pdf.text('Student Name:', 15, y + 13);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.student.name, 45, y + 13);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Roll Number:', 15, y + 19);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.student.rollNumber, 45, y + 19);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Registration No:', 15, y + 25);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.student.registrationNo, 45, y + 25);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Email Address:', 15, y + 31);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.student.email, 45, y + 31);

  // Col 2
  pdf.setFont('helvetica', 'bold');
  pdf.text('Department:', 115, y + 13);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.student.department, 145, y + 13);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Semester / Year:', 115, y + 19);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Semester ${receipt.student.semester} (${receipt.student.academicYear})`, 145, y + 19);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Quota / Category:', 115, y + 25);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${receipt.student.admissionQuota || 'MERIT'} / ${receipt.student.feeCategory || 'REGULAR'}`, 145, y + 25);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone Number:', 115, y + 31);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.student.phone || 'N/A', 145, y + 31);

  y += 41;

  // Fee Details Table Header
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(10, y, pageWidth - 20, 7, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);
  pdf.text('#', 14, y + 4.5);
  pdf.text('Fee Particulars & Component Breakdown', 25, y + 4.5);
  pdf.text('Category', 120, y + 4.5);
  pdf.text('Amount (INR)', pageWidth - 15, y + 4.5, { align: 'right' });

  y += 7;

  // Items
  const breakdown = receipt.feeDetails?.breakdown && receipt.feeDetails.breakdown.length > 0
    ? receipt.feeDetails.breakdown
    : [{ id: '1', category: 'Tuition & Semester Fee', amount: receipt.amount, description: 'Academic installment' }];

  breakdown.forEach((item, idx) => {
    pdf.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
    pdf.rect(10, y, pageWidth - 20, 6, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(String(idx + 1), 14, y + 4);
    pdf.text(item.description || item.category, 25, y + 4);
    pdf.text(item.category, 120, y + 4);
    pdf.text(`Rs. ${item.amount.toLocaleString('en-IN')}`, pageWidth - 15, y + 4, { align: 'right' });
    y += 6;
  });

  // Table Totals
  pdf.setFillColor(238, 242, 255); // indigo-50
  pdf.setDrawColor(199, 210, 254);
  pdf.rect(10, y, pageWidth - 20, 8, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 27, 75); // indigo-950
  pdf.text('Total Current Payment Amount:', 25, y + 5.5);
  pdf.text(`Rs. ${receipt.amount.toLocaleString('en-IN')}`, pageWidth - 15, y + 5.5, { align: 'right' });

  y += 12;

  // Financial Summary Breakdown Bar
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(10, y, pageWidth - 20, 14, 2, 2, 'FD');

  const totalFeeVal = receipt.feeDetails?.totalFee || receipt.amount;
  const prevPaidVal = receipt.feeDetails?.previousPaidAmount || Math.max(0, (receipt.feeDetails?.paidAmountAfterThis || receipt.amount) - receipt.amount);
  const remainingVal = receipt.feeDetails?.remainingPending || 0;

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Total Fee Demand', 20, y + 5);
  pdf.text('Previous Paid', 70, y + 5);
  pdf.text('Current Payment', 120, y + 5);
  pdf.text('Remaining Balance', 170, y + 5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Rs. ${totalFeeVal.toLocaleString('en-IN')}`, 20, y + 10);
  pdf.text(`Rs. ${prevPaidVal.toLocaleString('en-IN')}`, 70, y + 10);
  pdf.setTextColor(5, 150, 105);
  pdf.text(`Rs. ${receipt.amount.toLocaleString('en-IN')}`, 120, y + 10);
  pdf.setTextColor(remainingVal > 0 ? 225 : 15, remainingVal > 0 ? 29 : 23, remainingVal > 0 ? 72 : 42);
  pdf.text(`Rs. ${remainingVal.toLocaleString('en-IN')}`, 170, y + 10);

  y += 18;

  // Razorpay Gateway Identifiers Box
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(10, y, pageWidth - 20, 20, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('RAZORPAY GATEWAY AUDIT & SETTLEMENT IDENTIFIERS', 15, y + 5);

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Razorpay Payment ID:', 15, y + 10.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.paymentId, 55, y + 10.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Razorpay Order ID:', 15, y + 15.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.orderId, 55, y + 15.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Payment Method:', 125, y + 10.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.paymentMethod, 155, y + 10.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Verification Status:', 125, y + 15.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(5, 150, 105);
  pdf.text('VERIFIED & CAPTURED', 155, y + 15.5);

  y += 26;

  // Digital Signature & Disclaimer Footer
  pdf.setDrawColor(203, 213, 225);
  pdf.line(10, y, pageWidth - 10, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Digital Authentication: Cryptographically verified via Razorpay Server SDK & HMAC-SHA256.', 10, y + 5);
  pdf.text('This is a computer-generated digital fee receipt and requires no physical signature.', 10, y + 9);
  pdf.text(`System Generated on ${new Date().toLocaleString('en-IN')} | ITAS Portal`, 10, y + 13);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('FINANCE & ACCOUNTS DEPARTMENT', pageWidth - 10, y + 5, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.text(receipt.college.name, pageWidth - 10, y + 9, { align: 'right' });

  pdf.save(targetFileName);
}
