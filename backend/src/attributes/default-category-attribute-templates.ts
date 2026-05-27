import { AttributeOption, AttributeType, LocalizedString } from './attribute-definition.entity';

export interface AttributeTemplate {
  code: string;
  name: LocalizedString;
  group: LocalizedString;
  type: AttributeType;
  unit?: string;
  options?: AttributeOption[];
  filterable?: boolean;
  comparable?: boolean;
  required?: boolean;
  sortOrder: number;
}

const group = (ua: string, en: string): LocalizedString => ({ ua, en });
const loc = (ua: string, en: string): LocalizedString => ({ ua, en });
const option = (ua: string, en: string, value: string): AttributeOption => ({
  label: { ua, en },
  value,
});

const yesNoOptions = [option('Так', 'Yes', 'true'), option('Ні', 'No', 'false')];

export const commonAttributeTemplates = (): AttributeTemplate[] => {
  const main = group('Основні характеристики', 'Main characteristics');

  return [
    {
      code: 'brand',
      name: loc('Бренд', 'Brand'),
      group: main,
      type: AttributeType.ENUM,
      required: true,
      filterable: true,
      comparable: true,
      sortOrder: 10,
    },
    {
      code: 'model',
      name: loc('Модель', 'Model'),
      group: main,
      type: AttributeType.STRING,
      required: false,
      filterable: true,
      comparable: true,
      sortOrder: 20,
    },
  ];
};

export const smartphoneAttributeTemplates = (): AttributeTemplate[] => {
  const main = group('Основні характеристики', 'Main characteristics');
  const display = group('Екран', 'Display');
  const connectivity = group("Зв'язок", 'Connectivity');
  const os = group('ОС', 'Operating system');
  const processor = group('Процесор/Відеоприскорювач', 'Processor/Graphics');
  const memory = group("Пам'ять", 'Memory');
  const camera = group('Камера', 'Camera');
  const interfaces = group("Інтерфейси/роз'єми", 'Interfaces/Ports');
  const battery = group('Акумулятор', 'Battery');
  const features = group('Додаткові можливості', 'Additional features');
  const body = group('Корпус', 'Body');

  return [
    {
      code: 'condition',
      name: loc('Стан', 'Condition'),
      group: main,
      type: AttributeType.ENUM,
      options: [
        option('Новий', 'New', 'new'),
        option('Вживаний', 'Used', 'used'),
        option('Відновлений', 'Refurbished', 'refurbished'),
      ],
      required: true,
      filterable: true,
      comparable: false,
      sortOrder: 10,
    },
    {
      code: 'brand',
      name: loc('Бренд', 'Brand'),
      group: main,
      type: AttributeType.ENUM,
      required: true,
      filterable: true,
      comparable: true,
      sortOrder: 20,
    },
    {
      code: 'model',
      name: loc('Модель', 'Model'),
      group: main,
      type: AttributeType.STRING,
      required: true,
      filterable: true,
      comparable: true,
      sortOrder: 30,
    },
    {
      code: 'series',
      name: loc('Серія', 'Series'),
      group: main,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 40,
    },
    {
      code: 'release_year',
      name: loc('Рік випуску', 'Release year'),
      group: main,
      type: AttributeType.NUMBER,
      filterable: true,
      comparable: true,
      sortOrder: 50,
    },
    {
      code: 'product_line',
      name: loc('Лінійка', 'Product line'),
      group: main,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 60,
    },

    {
      code: 'screen_size',
      name: loc('Діагональ дисплея', 'Display size'),
      group: display,
      type: AttributeType.NUMBER,
      unit: '"',
      filterable: true,
      comparable: true,
      sortOrder: 100,
    },
    {
      code: 'screen_resolution',
      name: loc('Роздільна здатність екрану', 'Screen resolution'),
      group: display,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 110,
    },
    {
      code: 'screen_type',
      name: loc('Тип екрану', 'Screen type'),
      group: display,
      type: AttributeType.ENUM,
      options: [
        option('OLED', 'OLED', 'oled'),
        option('AMOLED', 'AMOLED', 'amoled'),
        option('Dynamic AMOLED', 'Dynamic AMOLED', 'dynamic-amoled'),
        option('Dynamic AMOLED 2X', 'Dynamic AMOLED 2X', 'dynamic-amoled-2x'),
        option('Super AMOLED', 'Super AMOLED', 'super-amoled'),
        option('Super Retina XDR', 'Super Retina XDR', 'super-retina-xdr'),
        option('LTPO OLED', 'LTPO OLED', 'ltpo-oled'),
        option('IPS', 'IPS', 'ips'),
        option('LCD', 'LCD', 'lcd'),
        option('PLS', 'PLS', 'pls'),
        option('TFT', 'TFT', 'tft'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 120,
    },
    {
      code: 'refresh_rate',
      name: loc('Частота оновлення екрану', 'Refresh rate'),
      group: display,
      type: AttributeType.NUMBER,
      unit: 'Гц',
      filterable: true,
      comparable: true,
      sortOrder: 130,
    },
    {
      code: 'touch_sampling_rate',
      name: loc('Частота дискретизації сенсора', 'Touch sampling rate'),
      group: display,
      type: AttributeType.NUMBER,
      unit: 'Гц',
      filterable: false,
      comparable: true,
      sortOrder: 140,
    },
    {
      code: 'brightness',
      name: loc('Пікова яскравість', 'Peak brightness'),
      group: display,
      type: AttributeType.STRING,
      filterable: false,
      comparable: true,
      sortOrder: 150,
    },
    {
      code: 'hdr_support',
      name: loc('Підтримка HDR', 'HDR support'),
      group: display,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 160,
    },
    {
      code: 'protective_glass',
      name: loc('Технологія захисного скла', 'Protective glass technology'),
      group: display,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 170,
    },
    {
      code: 'always_on_display',
      name: loc('Always-On Display', 'Always-On Display'),
      group: display,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 180,
    },

    {
      code: 'communication_standards',
      name: loc("Стандарти зв'язку", 'Cellular standards'),
      group: connectivity,
      type: AttributeType.MULTI_ENUM,
      options: [
        option('2G', '2G', '2g'),
        option('3G', '3G', '3g'),
        option('4G', '4G', '4g'),
        option('5G', '5G', '5g'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 200,
    },
    {
      code: 'sim_count',
      name: loc('Кількість SIM-карт', 'Number of SIM cards'),
      group: connectivity,
      type: AttributeType.ENUM,
      options: [
        option('1 SIM', '1 SIM', '1-sim'),
        option('2 SIM', '2 SIM', '2-sim'),
        option('1 SIM + e-SIM', '1 SIM + eSIM', '1-sim-e-sim'),
        option('2 SIM + e-SIM', '2 SIM + eSIM', '2-sim-e-sim'),
        option('2 e-SIM', '2 eSIM', '2-e-sim'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 210,
    },
    {
      code: 'sim_size',
      name: loc('Розмір SIM-карти', 'SIM card size'),
      group: connectivity,
      type: AttributeType.ENUM,
      options: [
        option('Nano-SIM', 'Nano-SIM', 'nano-sim'),
        option('Micro-SIM', 'Micro-SIM', 'micro-sim'),
        option('e-SIM', 'eSIM', 'e-sim'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 220,
    },
    {
      code: 'esim_support',
      name: loc('Підтримка e-SIM', 'eSIM support'),
      group: connectivity,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 230,
    },
    {
      code: 'volte_support',
      name: loc('Підтримка VoLTE', 'VoLTE support'),
      group: connectivity,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 240,
    },
    {
      code: 'network_features',
      name: loc('Мережеві технології', 'Network features'),
      group: connectivity,
      type: AttributeType.MULTI_ENUM,
      options: [
        option('VoLTE', 'VoLTE', 'volte'),
        option('VoWiFi', 'VoWiFi', 'vowifi'),
        option('LTE-A', 'LTE-A', 'lte-a'),
        option('5G mmWave', '5G mmWave', '5g-mmwave'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 250,
    },

    {
      code: 'operating_system',
      name: loc('Операційна система', 'Operating system'),
      group: os,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 300,
    },
    {
      code: 'ui_shell',
      name: loc('Фірмова оболонка', 'User interface shell'),
      group: os,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 310,
    },
    {
      code: 'update_support',
      name: loc('Підтримка оновлень', 'Update support'),
      group: os,
      type: AttributeType.STRING,
      filterable: false,
      comparable: true,
      sortOrder: 320,
    },

    {
      code: 'processor_model',
      name: loc('Модель процесора', 'Processor model'),
      group: processor,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 400,
    },
    {
      code: 'cpu_cores',
      name: loc('Кількість ядер', 'CPU cores'),
      group: processor,
      type: AttributeType.NUMBER,
      unit: 'ядер',
      filterable: true,
      comparable: true,
      sortOrder: 410,
    },
    {
      code: 'cpu_frequency',
      name: loc('Частота процесора', 'CPU frequency'),
      group: processor,
      type: AttributeType.STRING,
      filterable: false,
      comparable: true,
      sortOrder: 420,
    },
    {
      code: 'gpu_model',
      name: loc('Модель графічного процесора', 'GPU model'),
      group: processor,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 430,
    },
    {
      code: 'chipset_process',
      name: loc('Техпроцес процесора', 'Chipset process'),
      group: processor,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 440,
    },

    {
      code: 'ram',
      name: loc("Оперативна пам'ять", 'RAM'),
      group: memory,
      type: AttributeType.NUMBER,
      unit: 'ГБ',
      filterable: true,
      comparable: true,
      sortOrder: 500,
    },
    {
      code: 'storage',
      name: loc("Вбудована пам'ять", 'Built-in storage'),
      group: memory,
      type: AttributeType.NUMBER,
      unit: 'ГБ',
      filterable: true,
      comparable: true,
      sortOrder: 510,
    },
    {
      code: 'ram_type',
      name: loc("Тип оперативної пам'яті", 'RAM type'),
      group: memory,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 520,
    },
    {
      code: 'storage_type',
      name: loc('Тип накопичувача', 'Storage type'),
      group: memory,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 530,
    },
    {
      code: 'memory_expansion',
      name: loc("Розширення пам'яті", 'Memory expansion'),
      group: memory,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 540,
    },
    {
      code: 'memory_card_type',
      name: loc("Тип карти пам'яті", 'Memory card type'),
      group: memory,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 550,
    },

    {
      code: 'main_camera',
      name: loc('Основна камера', 'Main camera'),
      group: camera,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 600,
    },
    {
      code: 'main_camera_features',
      name: loc('Особливості основної камери', 'Main camera features'),
      group: camera,
      type: AttributeType.STRING,
      filterable: false,
      comparable: true,
      sortOrder: 610,
    },
    {
      code: 'max_video_resolution',
      name: loc('Максимальна роздільна здатність відео', 'Maximum video resolution'),
      group: camera,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 620,
    },
    {
      code: 'front_camera',
      name: loc('Фронтальна камера', 'Front camera'),
      group: camera,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 630,
    },
    {
      code: 'front_camera_features',
      name: loc('Особливості фронтальної камери', 'Front camera features'),
      group: camera,
      type: AttributeType.STRING,
      filterable: false,
      comparable: true,
      sortOrder: 640,
    },
    {
      code: 'flash',
      name: loc('Спалах', 'Flash'),
      group: camera,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 650,
    },
    {
      code: 'stabilization',
      name: loc('Стабілізація', 'Stabilization'),
      group: camera,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 660,
    },
    {
      code: 'zoom',
      name: loc('Зум', 'Zoom'),
      group: camera,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 670,
    },
    {
      code: 'camera_modes',
      name: loc('Режими камери', 'Camera modes'),
      group: camera,
      type: AttributeType.MULTI_ENUM,
      options: [
        option('Нічний режим', 'Night mode', 'night-mode'),
        option('Портретний режим', 'Portrait mode', 'portrait-mode'),
        option('Макро', 'Macro', 'macro'),
        option('Панорама', 'Panorama', 'panorama'),
        option('Slow Motion', 'Slow Motion', 'slow-motion'),
        option('ProRes', 'ProRes', 'prores'),
        option('RAW', 'RAW', 'raw'),
      ],
      filterable: false,
      comparable: true,
      sortOrder: 680,
    },

    {
      code: 'wifi_standard',
      name: loc('Стандарти Wi-Fi', 'Wi-Fi standards'),
      group: interfaces,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 700,
    },
    {
      code: 'bluetooth',
      name: loc('Bluetooth', 'Bluetooth'),
      group: interfaces,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 710,
    },
    {
      code: 'navigation_system',
      name: loc('Навігаційна система', 'Navigation system'),
      group: interfaces,
      type: AttributeType.MULTI_ENUM,
      options: [
        option('GPS', 'GPS', 'gps'),
        option('Beidou', 'Beidou', 'beidou'),
        option('Galileo', 'Galileo', 'galileo'),
        option('QZSS', 'QZSS', 'qzss'),
        option('ГЛОНАСС', 'GLONASS', 'glonass'),
        option('NavIC', 'NavIC', 'navic'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 720,
    },
    {
      code: 'usb_interface',
      name: loc('Інтерфейс USB', 'USB interface'),
      group: interfaces,
      type: AttributeType.ENUM,
      options: [
        option('USB Type-C', 'USB Type-C', 'usb-type-c'),
        option('Lightning', 'Lightning', 'lightning'),
        option('Micro-USB', 'Micro-USB', 'micro-usb'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 730,
    },
    {
      code: 'usb_version',
      name: loc('Версія USB', 'USB version'),
      group: interfaces,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 740,
    },
    {
      code: 'audio_jack',
      name: loc('Розʼєм 3.5 мм', '3.5 mm jack'),
      group: interfaces,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 750,
    },
    {
      code: 'wireless_technologies',
      name: loc('Бездротові технології', 'Wireless technologies'),
      group: interfaces,
      type: AttributeType.MULTI_ENUM,
      options: [
        option('NFC', 'NFC', 'nfc'),
        option('Бездротова зарядка', 'Wireless charging', 'wireless-charging'),
        option('MagSafe', 'MagSafe', 'magsafe'),
        option('UWB', 'UWB', 'uwb'),
        option('ІЧ-порт', 'IR blaster', 'ir-blaster'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 760,
    },

    {
      code: 'battery_capacity',
      name: loc('Ємність акумулятора', 'Battery capacity'),
      group: battery,
      type: AttributeType.NUMBER,
      unit: 'мАг',
      filterable: true,
      comparable: true,
      sortOrder: 800,
    },
    {
      code: 'battery_type',
      name: loc('Тип акумулятора', 'Battery type'),
      group: battery,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 810,
    },
    {
      code: 'fast_charging',
      name: loc('Швидка зарядка', 'Fast charging'),
      group: battery,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 820,
    },
    {
      code: 'charging_power',
      name: loc('Потужність зарядки', 'Charging power'),
      group: battery,
      type: AttributeType.NUMBER,
      unit: 'Вт',
      filterable: true,
      comparable: true,
      sortOrder: 830,
    },
    {
      code: 'wireless_charging_power',
      name: loc('Потужність бездротової зарядки', 'Wireless charging power'),
      group: battery,
      type: AttributeType.NUMBER,
      unit: 'Вт',
      filterable: true,
      comparable: true,
      sortOrder: 840,
    },
    {
      code: 'reverse_charging',
      name: loc('Реверсивна зарядка', 'Reverse charging'),
      group: battery,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 850,
    },

    {
      code: 'ai_integrated',
      name: loc('Інтегровано AI', 'Integrated AI'),
      group: features,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 900,
    },
    {
      code: 'dex_support',
      name: loc('Підтримка режиму робочого столу', 'Desktop mode support'),
      group: features,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 910,
    },
    {
      code: 'stylus_support',
      name: loc('Підтримка стилуса', 'Stylus support'),
      group: features,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 920,
    },
    {
      code: 'stereo_speakers',
      name: loc('Стереодинаміки', 'Stereo speakers'),
      group: features,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 930,
    },
    {
      code: 'ai_features',
      name: loc('AI-функції', 'AI features'),
      group: features,
      type: AttributeType.STRING,
      filterable: false,
      comparable: true,
      sortOrder: 940,
    },

    {
      code: 'body_protection',
      name: loc('Захист корпусу', 'Body protection'),
      group: body,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 1000,
    },
    {
      code: 'protection_class',
      name: loc('Клас захисту', 'Protection class'),
      group: body,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 1010,
    },
    {
      code: 'biometric_security',
      name: loc('Біометричний захист', 'Biometric security'),
      group: body,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 1020,
    },
    {
      code: 'package_contents',
      name: loc('Комплектація', 'Package contents'),
      group: body,
      type: AttributeType.MULTI_ENUM,
      options: [
        option('Смартфон', 'Smartphone', 'smartphone'),
        option('Кабель Type-C', 'Type-C cable', 'type-c-cable'),
        option('Кабель Lightning', 'Lightning cable', 'lightning-cable'),
        option('Інструкція', 'Manual', 'manual'),
        option('Гарантійний талон', 'Warranty card', 'warranty-card'),
        option('Зарядний пристрій', 'Charger', 'charger'),
        option('Скріпка для SIM', 'SIM eject tool', 'sim-eject-tool'),
        option('Стилус', 'Stylus', 'stylus'),
        option('Чохол', 'Case', 'case'),
      ],
      filterable: false,
      comparable: true,
      sortOrder: 1030,
    },
    {
      code: 'body_material',
      name: loc('Матеріал корпусу', 'Body material'),
      group: body,
      type: AttributeType.MULTI_ENUM,
      options: [
        option('Алюміній', 'Aluminium', 'aluminium'),
        option('Кераміка', 'Ceramic', 'ceramic'),
        option('Скло', 'Glass', 'glass'),
        option('Титан', 'Titanium', 'titanium'),
        option('Пластик', 'Plastic', 'plastic'),
        option('Сталь', 'Steel', 'steel'),
        option('Еко-шкіра', 'Eco leather', 'eco-leather'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 1040,
    },
    {
      code: 'form_factor',
      name: loc('Форм-фактор', 'Form factor'),
      group: body,
      type: AttributeType.ENUM,
      options: [
        option('Моноблок', 'Bar', 'bar'),
        option('Складаний', 'Foldable', 'foldable'),
        option('Розкладачка', 'Flip', 'flip'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 1050,
    },
    {
      code: 'foldable',
      name: loc('Складаний корпус', 'Foldable body'),
      group: body,
      type: AttributeType.BOOLEAN,
      options: yesNoOptions,
      filterable: true,
      comparable: true,
      sortOrder: 1060,
    },
    {
      code: 'height_mm',
      name: loc('Висота', 'Height'),
      group: body,
      type: AttributeType.NUMBER,
      unit: 'мм',
      filterable: true,
      comparable: true,
      sortOrder: 1070,
    },
    {
      code: 'width_mm',
      name: loc('Ширина', 'Width'),
      group: body,
      type: AttributeType.NUMBER,
      unit: 'мм',
      filterable: true,
      comparable: true,
      sortOrder: 1080,
    },
    {
      code: 'depth_mm',
      name: loc('Глибина', 'Depth'),
      group: body,
      type: AttributeType.NUMBER,
      unit: 'мм',
      filterable: true,
      comparable: true,
      sortOrder: 1090,
    },
    {
      code: 'weight_g',
      name: loc('Вага', 'Weight'),
      group: body,
      type: AttributeType.NUMBER,
      unit: 'г',
      filterable: true,
      comparable: true,
      sortOrder: 1100,
    },
    {
      code: 'color',
      name: loc('Колір виробника', 'Manufacturer color'),
      group: body,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 1110,
    },
    {
      code: 'color_family',
      name: loc('Основний колір', 'Main color'),
      group: body,
      type: AttributeType.ENUM,
      options: [
        option('Чорний', 'Black', 'black'),
        option('Білий', 'White', 'white'),
        option('Сірий', 'Gray', 'gray'),
        option('Сріблястий', 'Silver', 'silver'),
        option('Синій', 'Blue', 'blue'),
        option('Блакитний', 'Light blue', 'light-blue'),
        option('Зелений', 'Green', 'green'),
        option('Червоний', 'Red', 'red'),
        option('Рожевий', 'Pink', 'pink'),
        option('Фіолетовий', 'Purple', 'purple'),
        option('Жовтий', 'Yellow', 'yellow'),
        option('Золотистий', 'Gold', 'gold'),
        option('Помаранчевий', 'Orange', 'orange'),
        option('Бежевий', 'Beige', 'beige'),
      ],
      filterable: true,
      comparable: true,
      sortOrder: 1120,
    },
    {
      code: 'warranty_period',
      name: loc('Гарантійний термін', 'Warranty period'),
      group: body,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 1130,
    },
    {
      code: 'country_of_origin',
      name: loc('Країна виробництва', 'Country of origin'),
      group: body,
      type: AttributeType.STRING,
      filterable: true,
      comparable: true,
      sortOrder: 1140,
    },
  ];
};

export const laptopAttributeTemplates = (): AttributeTemplate[] => {
  const main = group('Основні характеристики', 'Main characteristics');
  const display = group('Екран', 'Display');
  const hardware = group('Процесор/Памʼять', 'Processor/Memory');

  return [
    ...commonAttributeTemplates(),
    {
      code: 'processor',
      name: loc('Процесор', 'Processor'),
      group: hardware,
      type: AttributeType.STRING,
      sortOrder: 100,
    },
    {
      code: 'ram',
      name: loc('Оперативна памʼять', 'RAM'),
      group: hardware,
      type: AttributeType.NUMBER,
      unit: 'ГБ',
      sortOrder: 110,
    },
    {
      code: 'storage',
      name: loc('Накопичувач', 'Storage'),
      group: hardware,
      type: AttributeType.NUMBER,
      unit: 'ГБ',
      sortOrder: 120,
    },
    {
      code: 'gpu',
      name: loc('Відеокарта', 'GPU'),
      group: hardware,
      type: AttributeType.STRING,
      sortOrder: 130,
    },
    {
      code: 'screen_size',
      name: loc('Діагональ екрана', 'Screen size'),
      group: display,
      type: AttributeType.NUMBER,
      unit: '"',
      sortOrder: 200,
    },
    {
      code: 'screen_resolution',
      name: loc('Роздільна здатність екрана', 'Screen resolution'),
      group: display,
      type: AttributeType.STRING,
      sortOrder: 210,
    },
    {
      code: 'os',
      name: loc('Операційна система', 'Operating system'),
      group: main,
      type: AttributeType.ENUM,
      sortOrder: 300,
    },
  ];
};

export const refrigeratorAttributeTemplates = (): AttributeTemplate[] => {
  const main = group('Загальні характеристики', 'General characteristics');
  const features = group('Особливості', 'Features');
  const dimensions = group('Технічні характеристики', 'Technical characteristics');

  return [
    ...commonAttributeTemplates(),
    {
      code: 'fridge_type',
      name: loc('Вид холодильника', 'Refrigerator type'),
      group: main,
      type: AttributeType.ENUM,
      required: true,
      sortOrder: 10,
    },
    {
      code: 'total_volume_l',
      name: loc('Загальний корисний обʼєм', 'Total usable volume'),
      group: main,
      type: AttributeType.NUMBER,
      unit: 'л',
      sortOrder: 20,
    },
    {
      code: 'fridge_volume_l',
      name: loc('Корисний обʼєм холодильної камери', 'Fridge chamber volume'),
      group: main,
      type: AttributeType.NUMBER,
      unit: 'л',
      sortOrder: 30,
    },
    {
      code: 'freezer_volume_l',
      name: loc('Корисний обʼєм морозильної камери', 'Freezer chamber volume'),
      group: main,
      type: AttributeType.NUMBER,
      unit: 'л',
      sortOrder: 40,
    },
    {
      code: 'energy_class',
      name: loc('Клас енергоспоживання', 'Energy class'),
      group: main,
      type: AttributeType.ENUM,
      sortOrder: 50,
    },
    {
      code: 'cooling_system',
      name: loc('Система охолодження', 'Cooling system'),
      group: main,
      type: AttributeType.ENUM,
      sortOrder: 60,
    },
    {
      code: 'compressor_type',
      name: loc('Тип компресора', 'Compressor type'),
      group: features,
      type: AttributeType.ENUM,
      sortOrder: 100,
    },
    {
      code: 'door_reversible',
      name: loc('Перенавішування дверей', 'Reversible doors'),
      group: features,
      type: AttributeType.BOOLEAN,
      sortOrder: 110,
    },
    {
      code: 'shelves_material',
      name: loc('Матеріал полиць', 'Shelves material'),
      group: features,
      type: AttributeType.ENUM,
      sortOrder: 120,
    },
    {
      code: 'height_cm',
      name: loc('Висота', 'Height'),
      group: dimensions,
      type: AttributeType.NUMBER,
      unit: 'см',
      sortOrder: 200,
    },
    {
      code: 'width_cm',
      name: loc('Ширина', 'Width'),
      group: dimensions,
      type: AttributeType.NUMBER,
      unit: 'см',
      sortOrder: 210,
    },
    {
      code: 'depth_cm',
      name: loc('Глибина', 'Depth'),
      group: dimensions,
      type: AttributeType.NUMBER,
      unit: 'см',
      sortOrder: 220,
    },
  ];
};

export const tvAttributeTemplates = (): AttributeTemplate[] => {
  const main = group('Основні характеристики', 'Main characteristics');
  const display = group('Екран', 'Display');

  return [
    ...commonAttributeTemplates(),
    {
      code: 'screen_size',
      name: loc('Діагональ екрана', 'Screen size'),
      group: display,
      type: AttributeType.NUMBER,
      unit: '"',
      sortOrder: 100,
    },
    {
      code: 'screen_resolution',
      name: loc('Роздільна здатність', 'Resolution'),
      group: display,
      type: AttributeType.ENUM,
      sortOrder: 110,
    },
    {
      code: 'matrix_type',
      name: loc('Тип матриці', 'Matrix type'),
      group: display,
      type: AttributeType.ENUM,
      sortOrder: 120,
    },
    {
      code: 'refresh_rate',
      name: loc('Частота оновлення', 'Refresh rate'),
      group: display,
      type: AttributeType.NUMBER,
      unit: 'Гц',
      sortOrder: 130,
    },
    {
      code: 'smart_tv',
      name: loc('Smart TV', 'Smart TV'),
      group: main,
      type: AttributeType.BOOLEAN,
      sortOrder: 200,
    },
  ];
};

export const accessoryAttributeTemplates = (): AttributeTemplate[] => {
  const main = group('Основні характеристики', 'Main characteristics');
  const compatibility = group('Сумісність', 'Compatibility');

  return [
    {
      code: 'accessory_type',
      name: loc('Тип аксесуара', 'Accessory type'),
      group: main,
      type: AttributeType.ENUM,
      required: true,
      sortOrder: 10,
    },
    {
      code: 'brand',
      name: loc('Бренд', 'Brand'),
      group: main,
      type: AttributeType.ENUM,
      required: true,
      sortOrder: 20,
    },
    {
      code: 'compatible_brand',
      name: loc('Сумісний бренд', 'Compatible brand'),
      group: compatibility,
      type: AttributeType.ENUM,
      sortOrder: 30,
    },
    {
      code: 'compatible_model',
      name: loc('Сумісна модель', 'Compatible model'),
      group: compatibility,
      type: AttributeType.STRING,
      sortOrder: 40,
    },
    {
      code: 'material',
      name: loc('Матеріал', 'Material'),
      group: main,
      type: AttributeType.ENUM,
      sortOrder: 50,
    },
    {
      code: 'color',
      name: loc('Колір', 'Color'),
      group: main,
      type: AttributeType.ENUM,
      sortOrder: 60,
    },
    {
      code: 'power_w',
      name: loc('Потужність', 'Power'),
      group: main,
      type: AttributeType.NUMBER,
      unit: 'Вт',
      sortOrder: 70,
    },
  ];
};

export type DefaultCategoryTemplateKind =
  | 'smartphones'
  | 'laptops'
  | 'refrigerators'
  | 'tv'
  | 'accessories'
  | 'common';

export const getDefaultTemplateKindForCategory = (
  categorySlug: string,
): DefaultCategoryTemplateKind => {
  const slug = categorySlug.toLowerCase();

  const isHeadphones =
    slug.includes('headphone') || slug.includes('navush') || slug.includes('навуш');

  if (
    !isHeadphones &&
    (slug.includes('smartphone') ||
      slug.includes('smartfon') ||
      slug.includes('smartfony') ||
      slug.includes('mobile-phone') ||
      slug.includes('mobilni-telefony') ||
      slug.includes('telefon') ||
      slug.includes('telefony') ||
      slug.includes('мартфон') ||
      slug.includes('телефон'))
  ) {
    return 'smartphones';
  }

  if (slug.includes('laptop') || slug.includes('notebook') || slug.includes('noutbuk')) {
    return 'laptops';
  }

  if (slug.includes('refrigerator') || slug.includes('fridge') || slug.includes('holodil')) {
    return 'refrigerators';
  }

  if (slug.includes('tv') || slug.includes('television') || slug.includes('televizor')) {
    return 'tv';
  }

  if (slug.includes('accessor') || slug.includes('case') || slug.includes('charger')) {
    return 'accessories';
  }

  return 'common';
};

export const shouldSyncExactDefaultTemplateForCategory = (categorySlug: string): boolean =>
  getDefaultTemplateKindForCategory(categorySlug) !== 'common';

export const getDefaultTemplatesForCategory = (categorySlug: string): AttributeTemplate[] => {
  const kind = getDefaultTemplateKindForCategory(categorySlug);

  if (kind === 'smartphones') return smartphoneAttributeTemplates();
  if (kind === 'laptops') return laptopAttributeTemplates();
  if (kind === 'refrigerators') return refrigeratorAttributeTemplates();
  if (kind === 'tv') return tvAttributeTemplates();
  if (kind === 'accessories') return accessoryAttributeTemplates();

  return commonAttributeTemplates();
};
