# PartnerZ — «Сюрприз для мамы»: аниматик и шот-лист для Higgsfield

Формат: вертикальный 9:16, 1080×1920, 30 fps, хронометраж 63.9 с.

## Что в пакете

| Файл | Зачем |
|---|---|
| `animatic_clean.mp4` | весь аниматик без текста, с озвучкой: эталон по таймингу |
| `shots/shotNN.mp4` | каждый шот отдельно (без звука), можно подавать как референс движения |
| `frames/shotNN_start.png`, `frames/shotNN_end.png` | первый и последний кадр шота: стартовый (и конечный) кадр для image-to-video |
| `subtitles.srt` | субтитры по озвучке, наложить после рендера |

## Как работать

1. Для каждого шота загрузить `shotNN_start.png` как стартовый кадр. Если модель умеет принимать конечный кадр, добавить `shotNN_end.png`.
2. В промпт вставить **общий стиль** + **персонажей, которые есть в кадре** + **промпт шота**.
3. Длину генерации поставить не короче длительности шота, лишнее отрезать при монтаже.
4. Собрать шоты по таймкодам, положить озвучку, наложить `subtitles.srt`.

## Общий стиль (добавлять в каждый промпт)

> Stylized 3D animated short film, soft rounded toy-like characters, smooth clay-like shading, warm cozy evening lighting, soft shadows, gentle depth of field, cinematic vertical 9:16 framing, wholesome family comedy tone, high quality animation, consistent characters.

## Персонажи (вставлять тех, кто в кадре)

- **DAD** — tall slim man, short dark-brown hair, big round black glossy eyes, rosy cheeks, teal-blue sweater, dark grey trousers, white sneakers.
- **MOM** — woman with long auburn-red hair and a small bun on top, big round black glossy eyes, rosy cheeks, mustard-yellow sweater, navy trousers, white sneakers.
- **SON** — 4-year-old boy, messy ginger hair with little spikes, freckles, big round black glossy eyes, red hoodie with front pocket, blue jeans, white sneakers.

## Локации

- **LIVING ROOM** — upscale modern apartment, deep blue-grey walls with classic wall panel moldings, tall window with rust velvet curtains, night city skyline outside, emerald velvet sofa on brass legs, round marble coffee table with brass base, framed abstract art in brass frames, walnut sideboard, brass floor lamp, round neutral rug, light oak chevron parquet.
- **BEDROOM** — elegant bedroom, soft blue walls with panel moldings, tall upholstered sage-green headboard with brass buttons, crisp white bedding with linen duvet and terracotta throw, walnut nightstand with brass handles and red digital clock, brass wall sconces, chevron parquet.
- **KITCHEN** — luxury kitchen: deep forest-green shaker cabinets with brass handles, white marble countertops and marble backsplash, glass-front upper cabinets with warm interior lighting, plaster range hood, black glass built-in oven tower, walnut floating shelves with ceramics, kitchen island with marble top, two brass dome pendant lights and walnut bar stools with brass legs, copper kettle, fresh flowers and fruit bowl, light oak chevron parquet, brass-rimmed wall clock, tall walnut door with brass lever to a warmly lit hallway.

## Шоты

| # | Таймкод | Длит. | Озвучка | Что происходит | Промпт шота |
|---|---|---|---|---|---|
| 01 | 0:00.00–0:01.30 | 1.3 | В этом доме все давно спали. | Дом снаружи ночью, все окна тёмные | Exterior of a small cozy two-storey house at night, all windows dark, starry sky, moon, low-poly pine trees, slow gentle push-in. |
| 02 | 0:01.30–0:02.42 | 1.1 | …спали. | Мама спит в кровати | MOM sleeping peacefully in bed under a blue blanket, eyes closed, soft breathing, moonlight from the window, slow push-in from above. BEDROOM. |
| 03 | 0:02.42–0:04.56 | 2.1 | Ну… почти все. | Темнота, моргают две пары глаз; включается фонарик — папа и сын с хитрыми улыбками | Pitch-dark LIVING ROOM, two pairs of eyes blink in the darkness, then a flashlight clicks on revealing DAD and SON grinning mischievously, SON raises both arms. |
| 04 | 0:04.56–0:06.35 | 1.8 | В три часа семнадцать минут… | Крупно красные электронные часы 03:17 | Close-up of a glowing red digital clock showing 03:17 on a sideboard at night, slow dolly-in. |
| 05 | 0:06.35–0:10.49 | 4.1 | …папа и его четырёхлетний сын решили устроить маме сюрприз. | Папа показывает на себя, сын подпрыгивает; папа присаживается и шепчет сыну, тот радостно поднимает руки, вылетают сердечки | DAD points at himself proudly, SON bounces, then DAD crouches down and whispers a secret plan to SON, SON throws arms up in excitement, little red hearts float up. LIVING ROOM, warm lamp light. |
| 06 | 0:10.49–0:12.85 | 2.4 | План был простой: приготовить завтрак… | На кухне включается свет, папа с сыном довольные | KITCHEN at night, lights switch on, DAD and SON stand in the middle of the kitchen with excited smiles, DAD gestures toward the stove. |
| 07 | 0:12.85–0:14.02 | 1.2 | …пока она спит. | Вставка: мама спит | MOM sleeping in bed, eyes closed, calm, top-down close shot. BEDROOM. |
| 08 | 0:14.02–0:20.18 | 6.2 | Но была одна небольшая проблема. Мама просыпалась даже от самого тихого звука. | Крупно спящая мама; падает пёрышко, касается одеяла — мама резко распахивает глаза, потом снова засыпает | Close-up of MOM sleeping, a tiny white feather slowly drifts down and lands on the blanket, MOM's eyes snap wide open in surprise, then she slowly closes them again. BEDROOM, moonlight. |
| 09 | 0:20.18–0:23.77 | 3.6 | Поэтому действовать нужно было предельно осторожно. | Папа и сын крадутся на цыпочках, папа держит палец у губ | DAD and SON tiptoe across the LIVING ROOM in an exaggerated sneaky walk, DAD holds a finger to his lips, SON balances with arms out, camera tracks sideways. |
| 10 | 0:23.77–0:26.40 | 2.6 | Первым делом им понадобилась скалка. | Папа чешет затылок, сын показывает на ящик | KITCHEN, DAD scratches his head thinking, SON points at a cabinet drawer, slow push-in. |
| 11 | 0:26.40–0:30.82 | 4.4 | Сын открыл кухонный ящик… и случайно его отпустил. | Сын вытягивает ящик со скалкой, отпускает — ящик летит закрываться, сын в ужасе поднимает руки | SON pulls open a kitchen drawer with a wooden rolling pin inside, then lets go — the drawer starts sliding shut fast, SON throws hands up in shock, mouth open. Side angle on the cabinets. |
| 12 | 0:30.82–0:31.75 | 0.9 | Папа уже представил… | Папа в ужасе держится за голову | Close-up of DAD with a horrified face, wide eyes, mouth open, hands on his head. KITCHEN. |
| 13 | 0:31.75–0:33.97 | 2.2 | …как просыпается весь дом. | Фантазия: в доме одно за другим загораются окна, кадр дрожит | Dream-like vision with soft glowing edges: the house exterior at night, windows light up one by one, the camera shakes slightly. |
| 14 | 0:33.97–0:35.90 | 1.9 | Но ящик закрылся совершенно бесшумно. | Ящик плавно замедляется и мягко, бесшумно закрывается; сын замер | The drawer slows down smoothly and closes softly and silently (soft-close), SON frozen with hands up. Side angle on the cabinets. Emphasize the gentle soft-close motion. |
| 15 | 0:35.90–0:37.19 | 1.3 | …бесшумно. | Облегчение: папа вытирает лоб, оба улыбаются | DAD wipes his forehead in relief and smiles, SON grins, KITCHEN wide shot. |
| 16 | 0:37.19–0:39.01 | 1.8 | Операция продолжилась. | Папа и сын дают пять | DAD crouches and gives SON a high five, small sparkle on impact, both happy. KITCHEN. |
| 17 | 0:39.01–0:40.10 | 1.1 | Через двадцать минут… | Стрелки настенных часов быстро прокручиваются | Close-up of a kitchen wall clock, minute hand spins fast forward 20 minutes. |
| 18 | 0:40.10–0:44.59 | 4.5 | …кухня выглядела так, будто здесь произошла небольшая катастрофа. | Мука летит облаками, брызги на стенах, кастрюля и скалка на полу; оба в муке и счастливые; в конце большой «пуф» муки | Messy KITCHEN chaos: flour clouds puff into the air, egg and flour splats on walls, pot and rolling pin on the floor, DAD and SON covered in flour laughing and waving arms, ending with a big flour poof. |
| 19 | 0:44.59–0:46.66 | 2.1 | Зато завтрак был готов. | Крупно поднос: стопка блинчиков с маслом, клубника, сок, цветок, сердечки | Close-up of a breakfast tray: tall stack of pancakes with butter and syrup, strawberries, glass of orange juice, small yellow flower in a vase, little hearts float up, slow orbit. |
| 20 | 0:46.66–0:48.97 | 2.3 | Оставалось только разбудить маму. | Папа несёт поднос, сын рядом; идут к двери | DAD carries the breakfast tray and walks with SON toward the kitchen door, proud smiles. |
| 21 | 0:48.97–0:51.47 | 2.5 | Правда, была одна деталь… | Папа и сын стоят перед закрытой дверью, сын тянется к ручке | DAD with the tray and SON stop in front of the closed wooden door, SON reaches for the handle, suspenseful slow push-in. |
| 22 | 0:51.47–0:53.60 | 2.1 | Мама уже десять минут… | Дверь открывается в коридор — там стоит мама, руки у лица | The door swings open into a warmly lit hallway revealing MOM standing there, hands near her face, touched smile; over-the-shoulder from behind DAD and SON. |
| 23 | 0:53.60–0:55.94 | 2.3 | …стояла за дверью и наблюдала за ними. | Крупно мама: подняла бровь, улыбается, сердечки | Close-up of MOM in the hallway, she raises an eyebrow knowingly, then smiles warmly with happy closed eyes, little hearts appear. |
| 24 | 0:55.94–0:59.46 | 3.5 | И это был лучший сюрприз в её жизни. | Семья обнимается, сын поднял руки, сердечки, камера медленно облетает | Family hug in the KITCHEN doorway: MOM and DAD crouch and hug SON who raises his arms happily, hearts float up, slow orbit, warm light. |
| 25 | 0:59.46–1:03.95 | 4.5 | PartnerZ. Мебель, с которой начинаются семейные истории. | Финал: уютная комната, деревянный комод, средний ящик выдвигается и мягко закрывается; семья рядом машет | Elegant warm room with panel-molded walls and chevron parquet, a walnut chest of drawers with brass handles, the middle drawer slides out and closes softly, the family stands around it smiling and waving, space at the top for the logo. |

Логотип **PartnerZ** в финале и субтитры накладываются при монтаже: генераторы плохо рисуют текст.
