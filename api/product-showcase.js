export default function handler(req, res) {
  res.status(200).json({
    products: [
      {
        id: 1,
        name: "Premium Gift Hamper",
        imageUrl: "https://images.unsplash.com/photo-1607083206968-13611e3d76db",
        category: "Festive",
      },
      {
        id: 2,
        name: "Corporate Welcome Kit",
        imageUrl: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad",
        category: "Onboarding",
      },
      {
        id: 3,
        name: "Tech Gift Set",
        imageUrl: "https://images.unsplash.com/photo-1580910051074-3eb694886505",
        category: "Tech",
      },
    ],
  });
}