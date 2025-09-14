import qrcode

upi_id = "sarmahrishi05-1@oksbi"
name = "Hrisikesh Sarma"
amount = 25  # in INR

upi_link = f"upi://pay?pa={upi_id}&pn={name}&am={amount}&cu=INR"

# Generate QR code
img = qrcode.make(upi_link)
img.save("upi_qr.png")
