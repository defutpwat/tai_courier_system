import qrcode
import io

def generate_tracking_qr(package_id: int, receiver_name: str, origin: str, dest: str, status: str) -> bytes:
    """
    Tworzy kod QR zawierający informacje o przesyłce i zwraca go jako surowe bajty PNG.
    """
    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=5
    )
    data = f"Tracking ID: {package_id}\nReceiver: {receiver_name}\nFrom: {origin}\nTo: {dest}\nStatus: {status}"
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue()
