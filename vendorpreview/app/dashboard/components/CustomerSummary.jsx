export default function CustomerSummary({ bills = [] }) {
  if (!bills.length) return null;

  return (
    <div className="bg-black border border-white/10 rounded-xl p-4 mt-4">
      <div className="text-gray-400 text-sm mb-2">Bill Loyalty Timeline</div>
      <div className="space-y-3">
        {bills.map((bill, idx) => {
          const amount = bill.total ?? bill.amount ?? bill.totalAmount ?? 0;
          const dateObj = new Date(bill.transactionDate || bill.createdAt);
          const formattedDate = dateObj.toLocaleDateString("en-IN");
          const formattedTime = dateObj.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const pointsEarned = bill.pointsEarned ?? bill.earned ?? 0;
          const daysLeft =
            typeof bill.daysLeft === "number" ? bill.daysLeft : null;

          let expiryText = null;
          let expiryClass = "text-green-400";

          if (daysLeft === 0) {
            expiryText = "Expires today";
            expiryClass = "text-yellow-400";
          } else if (daysLeft !== null && daysLeft < 0) {
            expiryText = "Expired";
            expiryClass = "text-red-400";
          } else if (daysLeft !== null && daysLeft > 0) {
            expiryText = `Expires in ${daysLeft} days`;
            if (daysLeft <= 7) {
              expiryClass = "text-yellow-400";
            }
          }

          return (
            <div key={bill.billId || idx} className="text-sm">
              <div className="text-white">
                ₹{Number(amount || 0).toLocaleString("en-IN")} •{" "}
                {formattedDate} • {formattedTime}
              </div>
              <div className="text-green-400">+{pointsEarned} pts earned</div>
              {expiryText && (
                <div className={expiryClass}>{expiryText}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
