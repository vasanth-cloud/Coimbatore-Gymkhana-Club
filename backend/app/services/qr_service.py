import io

import qrcode


class QRService:

    @staticmethod
    def generate_customer_qr(qr_token: str) -> io.BytesIO:
        """
        Generate a QR code containing the customer's
        secure QR token.
        """

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )

        qr.add_data(qr_token)
        qr.make(fit=True)

        image = qr.make_image()

        buffer = io.BytesIO()

        image.save(
            buffer,
            format="PNG",
        )

        buffer.seek(0)

        return buffer