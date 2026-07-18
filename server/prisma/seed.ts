import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Common foods with average nutritional values per 100 g.
// carbs100 is what drives ХЕ (carbs100 / xeGramsPerUnit).
const foods: Array<{
  name: string;
  category: string;
  kcal100: number;
  protein100: number;
  fat100: number;
  carbs100: number;
}> = [
  // Хлеб и выпечка
  { name: "Хлеб белый пшеничный", category: "Хлеб и выпечка", kcal100: 265, protein100: 8.1, fat100: 3.2, carbs100: 48.8 },
  { name: "Хлеб ржаной (чёрный)", category: "Хлеб и выпечка", kcal100: 214, protein100: 6.6, fat100: 1.2, carbs100: 40.7 },
  { name: "Батон нарезной", category: "Хлеб и выпечка", kcal100: 264, protein100: 7.5, fat100: 2.9, carbs100: 50.9 },
  { name: "Булочка сдобная", category: "Хлеб и выпечка", kcal100: 300, protein100: 7.6, fat100: 6.8, carbs100: 51.9 },
  { name: "Лаваш", category: "Хлеб и выпечка", kcal100: 236, protein100: 7.9, fat100: 1.0, carbs100: 47.6 },

  // Крупы и каши (сухие/варёные — указано варёные, кроме отмеченных)
  { name: "Гречка варёная", category: "Крупы", kcal100: 132, protein100: 4.5, fat100: 1.1, carbs100: 25.0 },
  { name: "Рис белый варёный", category: "Крупы", kcal100: 130, protein100: 2.4, fat100: 0.3, carbs100: 28.2 },
  { name: "Овсянка варёная на воде", category: "Крупы", kcal100: 88, protein100: 3.0, fat100: 1.7, carbs100: 15.0 },
  { name: "Пшённая каша варёная", category: "Крупы", kcal100: 135, protein100: 3.8, fat100: 1.5, carbs100: 26.1 },
  { name: "Перловая каша варёная", category: "Крупы", kcal100: 106, protein100: 3.1, fat100: 0.4, carbs100: 22.2 },
  { name: "Манная каша на воде", category: "Крупы", kcal100: 80, protein100: 2.6, fat100: 0.2, carbs100: 16.0 },
  { name: "Булгур варёный", category: "Крупы", kcal100: 83, protein100: 3.1, fat100: 0.2, carbs100: 18.6 },
  { name: "Киноа варёная", category: "Крупы", kcal100: 120, protein100: 4.4, fat100: 1.9, carbs100: 21.3 },
  { name: "Макароны варёные", category: "Крупы", kcal100: 112, protein100: 3.5, fat100: 0.4, carbs100: 23.2 },

  // Молочные продукты
  { name: "Молоко 2.5%", category: "Молочные продукты", kcal100: 52, protein100: 2.8, fat100: 2.5, carbs100: 4.7 },
  { name: "Кефир 1%", category: "Молочные продукты", kcal100: 40, protein100: 3.0, fat100: 1.0, carbs100: 4.0 },
  { name: "Йогурт натуральный без сахара", category: "Молочные продукты", kcal100: 66, protein100: 5.0, fat100: 3.2, carbs100: 3.5 },
  { name: "Творог 5%", category: "Молочные продукты", kcal100: 121, protein100: 17.2, fat100: 5.0, carbs100: 1.8 },
  { name: "Сметана 15%", category: "Молочные продукты", kcal100: 158, protein100: 2.6, fat100: 15.0, carbs100: 3.0 },
  { name: "Сыр твёрдый (типа Российский)", category: "Молочные продукты", kcal100: 363, protein100: 24.1, fat100: 29.5, carbs100: 0.3 },
  { name: "Ряженка", category: "Молочные продукты", kcal100: 54, protein100: 2.9, fat100: 2.5, carbs100: 4.2 },
  { name: "Мороженое пломбир", category: "Молочные продукты", kcal100: 227, protein100: 3.5, fat100: 15.0, carbs100: 20.0 },

  // Фрукты
  { name: "Яблоко", category: "Фрукты", kcal100: 47, protein100: 0.4, fat100: 0.4, carbs100: 9.8 },
  { name: "Банан", category: "Фрукты", kcal100: 96, protein100: 1.5, fat100: 0.2, carbs100: 21.8 },
  { name: "Апельсин", category: "Фрукты", kcal100: 43, protein100: 0.9, fat100: 0.2, carbs100: 8.1 },
  { name: "Груша", category: "Фрукты", kcal100: 42, protein100: 0.4, fat100: 0.3, carbs100: 10.3 },
  { name: "Виноград", category: "Фрукты", kcal100: 65, protein100: 0.6, fat100: 0.2, carbs100: 16.8 },
  { name: "Мандарин", category: "Фрукты", kcal100: 38, protein100: 0.8, fat100: 0.2, carbs100: 7.5 },
  { name: "Персик", category: "Фрукты", kcal100: 39, protein100: 0.9, fat100: 0.1, carbs100: 9.5 },
  { name: "Клубника", category: "Фрукты", kcal100: 32, protein100: 0.7, fat100: 0.3, carbs100: 6.3 },
  { name: "Арбуз", category: "Фрукты", kcal100: 27, protein100: 0.6, fat100: 0.1, carbs100: 5.8 },
  { name: "Киви", category: "Фрукты", kcal100: 47, protein100: 1.0, fat100: 0.5, carbs100: 8.1 },
  { name: "Хурма", category: "Фрукты", kcal100: 66, protein100: 0.5, fat100: 0.3, carbs100: 15.3 },

  // Овощи
  { name: "Картофель варёный", category: "Овощи", kcal100: 82, protein100: 2.0, fat100: 0.4, carbs100: 16.7 },
  { name: "Картофель жареный", category: "Овощи", kcal100: 192, protein100: 2.8, fat100: 9.5, carbs100: 23.4 },
  { name: "Морковь", category: "Овощи", kcal100: 32, protein100: 1.3, fat100: 0.1, carbs100: 6.9 },
  { name: "Свёкла варёная", category: "Овощи", kcal100: 40, protein100: 1.5, fat100: 0.1, carbs100: 8.8 },
  { name: "Капуста белокочанная", category: "Овощи", kcal100: 25, protein100: 1.8, fat100: 0.1, carbs100: 4.7 },
  { name: "Огурец", category: "Овощи", kcal100: 15, protein100: 0.8, fat100: 0.1, carbs100: 2.5 },
  { name: "Помидор", category: "Овощи", kcal100: 20, protein100: 0.9, fat100: 0.2, carbs100: 3.9 },
  { name: "Лук репчатый", category: "Овощи", kcal100: 41, protein100: 1.4, fat100: 0.2, carbs100: 8.2 },
  { name: "Кукуруза варёная", category: "Овощи", kcal100: 96, protein100: 3.4, fat100: 1.5, carbs100: 16.6 },
  { name: "Горошек зелёный", category: "Овощи", kcal100: 73, protein100: 5.0, fat100: 0.2, carbs100: 12.8 },
  { name: "Тыква", category: "Овощи", kcal100: 22, protein100: 1.0, fat100: 0.1, carbs100: 4.4 },

  // Бобовые
  { name: "Фасоль варёная", category: "Бобовые", kcal100: 123, protein100: 8.4, fat100: 0.5, carbs100: 21.5 },
  { name: "Чечевица варёная", category: "Бобовые", kcal100: 116, protein100: 9.0, fat100: 0.4, carbs100: 20.0 },

  // Мясо, птица, рыба (практически без углеводов, но важны для БЖУ)
  { name: "Куриная грудка варёная", category: "Мясо и рыба", kcal100: 137, protein100: 29.8, fat100: 1.8, carbs100: 0.5 },
  { name: "Говядина варёная", category: "Мясо и рыба", kcal100: 254, protein100: 25.8, fat100: 16.8, carbs100: 0 },
  { name: "Свинина жареная", category: "Мясо и рыба", kcal100: 357, protein100: 22.6, fat100: 29.6, carbs100: 0 },
  { name: "Котлета говяжья жареная", category: "Мясо и рыба", kcal100: 220, protein100: 14.0, fat100: 15.0, carbs100: 8.0 },
  { name: "Сосиски варёные", category: "Мясо и рыба", kcal100: 266, protein100: 11.0, fat100: 24.0, carbs100: 2.0 },
  { name: "Рыба (треска) варёная", category: "Мясо и рыба", kcal100: 78, protein100: 17.8, fat100: 0.7, carbs100: 0 },
  { name: "Лосось запечённый", category: "Мясо и рыба", kcal100: 208, protein100: 22.1, fat100: 12.4, carbs100: 0 },
  { name: "Яйцо куриное варёное", category: "Мясо и рыба", kcal100: 155, protein100: 12.6, fat100: 10.6, carbs100: 1.1 },

  // Сладости и десерты (важно для расчёта ХЕ!)
  { name: "Сахар", category: "Сладости", kcal100: 398, protein100: 0, fat100: 0, carbs100: 99.8 },
  { name: "Мёд", category: "Сладости", kcal100: 304, protein100: 0.8, fat100: 0, carbs100: 81.5 },
  { name: "Шоколад молочный", category: "Сладости", kcal100: 534, protein100: 6.9, fat100: 30.4, carbs100: 54.8 },
  { name: "Мороженое пломбир глазированное", category: "Сладости", kcal100: 270, protein100: 3.0, fat100: 20.0, carbs100: 18.0 },
  { name: "Печенье песочное", category: "Сладости", kcal100: 436, protein100: 6.0, fat100: 18.0, carbs100: 65.0 },
  { name: "Вафли с начинкой", category: "Сладости", kcal100: 430, protein100: 3.5, fat100: 20.0, carbs100: 65.0 },
  { name: "Пирожное бисквитное", category: "Сладости", kcal100: 344, protein100: 4.7, fat100: 9.3, carbs100: 60.4 },
  { name: "Варенье", category: "Сладости", kcal100: 271, protein100: 0.3, fat100: 0.2, carbs100: 68.2 },
  { name: "Зефир", category: "Сладости", kcal100: 326, protein100: 0.8, fat100: 0.2, carbs100: 79.8 },

  // Напитки
  { name: "Сок яблочный", category: "Напитки", kcal100: 46, protein100: 0.2, fat100: 0.1, carbs100: 11.4 },
  { name: "Сок апельсиновый", category: "Напитки", kcal100: 45, protein100: 0.7, fat100: 0.2, carbs100: 10.4 },
  { name: "Компот из сухофруктов", category: "Напитки", kcal100: 60, protein100: 0.1, fat100: 0, carbs100: 14.8 },
  { name: "Кола / сладкая газировка", category: "Напитки", kcal100: 42, protein100: 0, fat100: 0, carbs100: 10.6 },
  { name: "Пиво светлое", category: "Напитки", kcal100: 42, protein100: 0.3, fat100: 0, carbs100: 3.5 },

  // Орехи и семена (мало углеводов, много жиров)
  { name: "Грецкий орех", category: "Орехи", kcal100: 654, protein100: 15.2, fat100: 65.2, carbs100: 7.0 },
  { name: "Миндаль", category: "Орехи", kcal100: 609, protein100: 21.2, fat100: 49.9, carbs100: 21.7 },
  { name: "Семечки подсолнечника", category: "Орехи", kcal100: 601, protein100: 20.7, fat100: 52.9, carbs100: 10.5 },

  // Фастфуд и готовые блюда
  { name: "Пицца Маргарита", category: "Фастфуд", kcal100: 266, protein100: 11.0, fat100: 10.0, carbs100: 33.0 },
  { name: "Пельмени варёные", category: "Готовые блюда", kcal100: 220, protein100: 11.9, fat100: 12.4, carbs100: 16.0 },
  { name: "Плов с мясом", category: "Готовые блюда", kcal100: 190, protein100: 8.0, fat100: 8.5, carbs100: 20.0 },
  { name: "Борщ со сметаной", category: "Готовые блюда", kcal100: 49, protein100: 1.9, fat100: 2.4, carbs100: 5.0 },
  { name: "Оладьи", category: "Готовые блюда", kcal100: 233, protein100: 6.3, fat100: 6.2, carbs100: 38.0 },
  { name: "Блины", category: "Готовые блюда", kcal100: 233, protein100: 6.1, fat100: 7.1, carbs100: 35.6 },
];

async function main() {
  console.log(`Seeding ${foods.length} food items...`);
  for (const food of foods) {
    const existing = await prisma.foodItem.findFirst({
      where: { name: food.name, isCustom: false },
    });
    if (!existing) {
      await prisma.foodItem.create({ data: { ...food, isCustom: false } });
    }
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
