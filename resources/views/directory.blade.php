<!doctype html>

<html class="light" lang="en">
    <head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>User Profile | Malang Raya Tourism</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <link
            href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&amp;family=Inter:wght@400;500;600&amp;display=swap"
            rel="stylesheet"
        />
        <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"
            rel="stylesheet"
        />
        <script src="{{ asset('assets/tailwind-config.js') }}"></script>
        <link rel="stylesheet" href="{{ asset('assets/style.css') }}" />
        <script src="{{ asset('assets/script.js') }}" defer></script>
    </head>
    <body
        class="bg-background text-on-background font-body selection:bg-primary-fixed-dim selection:text-on-primary-fixed"
    >
        <!-- TopNavBar -->
        <nav
            class="w-full sticky top-0 z-50 bg-[#f8fafb] dark:bg-[#2e3132] shadow-sm dark:shadow-none"
        >
            <div
                class="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto"
            >
                <div
                    class="text-2xl font-black text-[#006565] dark:text-[#93f2f2] tracking-tight font-headline"
                >
                    Malang Raya
                </div>
                <div
                    class="hidden md:flex items-center gap-8 font-manrope font-bold text-lg leading-relaxed"
                >
                    <a
                        class="text-slate-600 dark:text-slate-300 hover:text-[#008080] dark:hover:text-[#93f2f2] transition-colors duration-200"
                        href="/"
                        >Home</a
                    >
                    <a
                        class="text-slate-600 dark:text-slate-300 hover:text-[#008080] dark:hover:text-[#93f2f2] transition-colors duration-200"
                        href="/recommender"
                        >Explore</a
                    >
                    <a
                        class="text-slate-600 dark:text-slate-300 hover:text-[#008080] dark:hover:text-[#93f2f2] transition-colors duration-200"
                        href="/how-it-works"
                        >How It Works</a
                    >
                    <a
                        class="text-slate-600 dark:text-slate-300 hover:text-[#008080] dark:hover:text-[#93f2f2] transition-colors duration-200"
                        href="/dashboard"
                        >Saved</a
                    >
                </div>
                <div class="flex items-center gap-4">
                    <button
                        class="text-[#006565] dark:text-[#93f2f2] border-b-2 border-[#006565] pb-1 font-headline font-bold text-lg active:opacity-80 duration-200"
                    >
                        Profile
                    </button>
                </div>
            </div>
            <div class="bg-[#e6e8e9] dark:bg-white/10 h-[1px]"></div>
        </nav>
        <main
            class="max-w-7xl mx-auto px-8 py-12 flex flex-col lg:flex-row gap-12"
        >
            <!-- Sidebar Shell (SideNavBar Mapping) -->
            <aside
                class="h-auto w-full lg:w-64 flex flex-col gap-6 font-inter text-sm font-medium"
            >
                <div class="flex flex-col gap-1 mb-4">
                    <div
                        class="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high border-2 border-primary/10"
                    >
                        <img
                            alt="User Profile"
                            data-alt="close-up portrait of a friendly smiling man in a high-end studio setting with soft warm rim lighting"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2oYWf2DDQHMpXskAzcUoCKtaa0yVZVVfkYRX5KzwGvbDeEdIrjqxfl64BE895k4iBvJm6K_O_DzcePAkvGQ7HMhgulBCx31sAyrNM1wM13gP92aYMyD21GDnxy6S_Yn9MkHhW9cAJaB__mDIxKK2hO5FqFGp1APF5q7rZoKcY9xUeGO2Za3ZbQgxK4fjqo7Y0dK8vPZxCPA04gxzqX1pZYv6wwLqlW2bfS8jMnQOpgPALn8f_trcVztTCRYANCHK3SDL0KlaMTb4"
                        />
                    </div>
                    <h3
                        class="font-headline font-bold text-lg text-primary mt-2"
                    >
                        Dian Wijaya
                    </h3>
                    <p class="text-slate-500 text-xs">Member since Jan 2024</p>
                </div>
                <div class="flex flex-col gap-2">
                    <p
                        class="text-xs uppercase tracking-widest text-outline font-bold mb-2"
                    >
                        Location Filters
                    </p>
                    <div
                        class="bg-[#006565] text-white rounded-lg px-4 py-2 cursor-pointer active:scale-95 transition-all flex items-center gap-3"
                    >
                        <span
                            class="material-symbols-outlined text-sm"
                            data-icon="location_city"
                            >location_city</span
                        >
                        Kota Malang
                    </div>
                    <div
                        class="text-slate-500 dark:text-slate-400 px-4 py-2 hover:bg-[#e6e8e9] dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center gap-3"
                    >
                        <span
                            class="material-symbols-outlined text-sm"
                            data-icon="terrain"
                            >terrain</span
                        >
                        Kabupaten Malang
                    </div>
                    <div
                        class="text-slate-500 dark:text-slate-400 px-4 py-2 hover:bg-[#e6e8e9] dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center gap-3"
                    >
                        <span
                            class="material-symbols-outlined text-sm"
                            data-icon="landscape"
                            >landscape</span
                        >
                        Kota Batu
                    </div>
                </div>
                <div class="flex flex-col gap-2 mt-4">
                    <p
                        class="text-xs uppercase tracking-widest text-outline font-bold mb-2"
                    >
                        Categories
                    </p>
                    <div
                        class="text-slate-500 dark:text-slate-400 px-4 py-2 hover:bg-[#e6e8e9] dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer flex items-center gap-3"
                    >
                        <span
                            class="material-symbols-outlined text-sm"
                            data-icon="forest"
                            >forest</span
                        >
                        Nature
                    </div>
                    <div
                        class="text-slate-500 dark:text-slate-400 px-4 py-2 hover:bg-[#e6e8e9] dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer flex items-center gap-3"
                    >
                        <span
                            class="material-symbols-outlined text-sm"
                            data-icon="museum"
                            >museum</span
                        >
                        Culture
                    </div>
                    <div
                        class="text-slate-500 dark:text-slate-400 px-4 py-2 hover:bg-[#e6e8e9] dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer flex items-center gap-3"
                    >
                        <span
                            class="material-symbols-outlined text-sm"
                            data-icon="restaurant"
                            >restaurant</span
                        >
                        Culinary
                    </div>
                </div>
            </aside>
            <!-- Main Content Canvas -->
            <div class="flex-1 space-y-12">
                <!-- Bento Hero Section: Travel Persona & Stats -->
                <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Travel Persona (The AI Pivot) -->
                    <div
                        class="md:col-span-2 persona-gradient rounded-full p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[280px]"
                    >
                        <div class="relative z-10">
                            <span
                                class="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                                >FCM Clustering Intelligence</span
                            >
                            <h2
                                class="text-4xl font-headline font-extrabold mt-4 mb-2"
                            >
                                The Balanced Traveler
                            </h2>
                            <p
                                class="text-primary-fixed leading-relaxed max-w-md"
                            >
                                Your profile suggests a perfect equilibrium
                                between urban exploration and nature retreats.
                                You value cultural authenticity as much as
                                modern comfort.
                            </p>
                        </div>
                        <div class="relative z-10 flex gap-4 mt-6">
                            <div class="flex flex-col">
                                <span class="text-xs opacity-70"
                                    >Travel Score</span
                                >
                                <span class="text-2xl font-black">94/100</span>
                            </div>
                            <div class="w-[1px] bg-white/20 mx-2"></div>
                            <div class="flex flex-col">
                                <span class="text-xs opacity-70"
                                    >Compatibility</span
                                >
                                <span class="text-2xl font-black">88%</span>
                            </div>
                        </div>
                        <!-- Decorative Glass Element -->
                        <div
                            class="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"
                        ></div>
                    </div>
                    <!-- Budget Breakdown Card -->
                    <div
                        class="bg-surface-container-lowest rounded-xl p-8 flex flex-col justify-between shadow-sm"
                    >
                        <div>
                            <h3
                                class="font-headline font-bold text-lg text-primary mb-6"
                            >
                                Smart Budgeting
                            </h3>
                            <div class="space-y-4">
                                <!-- Chart Item -->
                                <div class="space-y-1">
                                    <div
                                        class="flex justify-between text-xs font-medium"
                                    >
                                        <span>Transportation</span>
                                        <span>40%</span>
                                    </div>
                                    <div
                                        class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"
                                    >
                                        <div
                                            class="bg-primary h-full w-[40%]"
                                        ></div>
                                    </div>
                                </div>
                                <!-- Chart Item -->
                                <div class="space-y-1">
                                    <div
                                        class="flex justify-between text-xs font-medium"
                                    >
                                        <span>Accommodation</span>
                                        <span>25%</span>
                                    </div>
                                    <div
                                        class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"
                                    >
                                        <div
                                            class="bg-primary/70 h-full w-[25%]"
                                        ></div>
                                    </div>
                                </div>
                                <!-- Chart Item -->
                                <div class="space-y-1">
                                    <div
                                        class="flex justify-between text-xs font-medium"
                                    >
                                        <span>Culinary</span>
                                        <span>20%</span>
                                    </div>
                                    <div
                                        class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"
                                    >
                                        <div
                                            class="bg-tertiary-container h-full w-[20%]"
                                        ></div>
                                    </div>
                                </div>
                                <!-- Chart Item -->
                                <div class="space-y-1">
                                    <div
                                        class="flex justify-between text-xs font-medium"
                                    >
                                        <span>Attractions</span>
                                        <span>15%</span>
                                    </div>
                                    <div
                                        class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"
                                    >
                                        <div
                                            class="bg-outline-variant h-full w-[15%]"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            class="w-full mt-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            Adjust Goals
                        </button>
                    </div>
                </section>
                <!-- Saved Destinations Grid (Editorial Mosaic) -->
                <section>
                    <div class="flex justify-between items-end mb-8">
                        <h2
                            class="text-3xl font-headline font-extrabold text-on-surface tracking-tight"
                        >
                            Saved Destinations
                        </h2>
                        <a
                            class="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4"
                            href="#"
                            >View All</a
                        >
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <!-- Mosaic Item 1: Large -->
                        <div
                            class="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-xl bg-surface-container-lowest transition-all hover:-translate-y-1"
                        >
                            <img
                                alt="Mount Bromo"
                                class="w-full h-full object-cover aspect-[4/5]"
                                data-alt="dramatic wide angle shot of Mount Bromo volcanic crater at sunrise with orange and purple atmospheric light and morning mist"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUeynTRD73eq84EWC30FqlKyPknP_NIuOxFwpQjxi8QwR6ioNDUzWWGGS5Av66pSzB8hL3V-xXYCOhyJ9udcjWq6kfH1GbjnGTH1XfFO1xHvMe1uObOgVCMemWzc76-RuWHwg4zJtlMjfNp597xjIBqsRtDqc1K5aWQr-bXwsUGWA1tX4yoX7T9ptEcKwR-R4zY-oEWqVoeutS1zFgKFOJoztG-ZZcyjJboCY0cqCST3pvTivL9CKwUSixDIFLwzMjtypOb9MqN10"
                            />
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end text-white"
                            >
                                <span
                                    class="text-xs font-bold bg-tertiary-container text-on-tertiary-fixed px-2 py-1 rounded w-fit mb-2"
                                    >Must Visit</span
                                >
                                <h4 class="text-2xl font-headline font-bold">
                                    Mount Bromo
                                </h4>
                                <p class="text-sm opacity-80">
                                    Kabupaten Malang • 4.9 Rating
                                </p>
                            </div>
                        </div>
                        <!-- Mosaic Item 2: Vertical -->
                        <div
                            class="group relative overflow-hidden rounded-xl bg-surface-container-lowest transition-all hover:-translate-y-1"
                        >
                            <img
                                alt="Jodipan"
                                class="w-full h-full object-cover aspect-[3/4]"
                                data-alt="vibrant colorful houses of Kampung Warna Warni Jodipan in Malang, bright primary colors under a clear blue sky"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJad0wGatBj9RKf88dRoDd8GWqPxq44g2Zk0jQNxnxfWTAzdrwNkN0WeTmuxg9Dm7zrTEz-bco6DBf0ZHOguY_a2YEdhBNq-MYwoIQq1Q1zOZVQa-_a2ztO2VB-3cJg9XsRG4B7vwHeZqyX1Z2PLpciowc0w5QnZhNqY0TJn2W3E23owBe0rjvu1UxLZqaoBPODkvJaDuHl60X3o-W9G8mKwGxDZ674HAfmKYFtplrB3Fe7I5q60B8cL4qHOJ20efXxTTxbzOcxxM"
                            />
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent p-4 flex flex-col justify-end text-white"
                            >
                                <h4 class="text-lg font-headline font-bold">
                                    Kampung Warna Warni
                                </h4>
                                <p class="text-xs opacity-80">Kota Malang</p>
                            </div>
                        </div>
                        <!-- Mosaic Item 3: Square -->
                        <div
                            class="group relative overflow-hidden rounded-xl bg-surface-container-lowest transition-all hover:-translate-y-1"
                        >
                            <img
                                alt="Culinary"
                                class="w-full h-full object-cover aspect-square"
                                data-alt="traditional Indonesian satay grilling over hot coals with smoke rising and rich dark peanut sauce in an outdoor setting"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBU6_miItmFfGSsTY19U4kIDNlKaPwMlUwFESyxo2ZK0ULUV_zbUyvHI8bOyS7Pg6WK31NociapZxm7WZFWB12JWw3mpmBl6WDzKbW-FASwF9sU3hvk-PXU8nlAnEEuVCf02bWLISEsgUNH-q1ZCS8gtI9xgq79nopI3D4xSBAA3eZOvGIIfOucyay-3dPEOW8J05Qg7j5_gd9V_1Euee9f1Cr0sQ1LT_6eZWL-koqieW9M3AUcbR8nlrZFlVxNMaykMzMxnzisRJk"
                            />
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent p-4 flex flex-col justify-end text-white"
                            >
                                <h4 class="text-lg font-headline font-bold">
                                    Sate Bunul H. Paino
                                </h4>
                                <p class="text-xs opacity-80">
                                    Culinary • Kota Malang
                                </p>
                            </div>
                        </div>
                        <!-- Mosaic Item 4: Horizontal -->
                        <div
                            class="md:col-span-2 group relative overflow-hidden rounded-xl bg-surface-container-lowest transition-all hover:-translate-y-1"
                        >
                            <img
                                alt="Coban Rondo"
                                class="w-full h-48 object-cover"
                                data-alt="majestic high waterfall in a lush green tropical forest with water spray and sunlight filtering through the canopy"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH04JQIzOPT03dAGP8i1YiEr8mIblpoi6KL9eMl5Ol5eJoSPW2PeYX2hQVIh1YaytNyhdAX4XPuoHxg_vSGQnw94sTYRnOToSa4PMy_GZKJRI6Qa5lnGhyFjb8qSQaKsr6rVJ6ZqcC7K5tAfQAHqe1fRQYsakt1jHJBnugHIq3BHPzJccbTXc-UOKeK0VjEGOWiqiTzbG6Q-oGqvwcAw-KFDIqfq0xXrJkCD6ZLMKaiYlbaOd0izNTMJh5Rw0aCrgm82x9ApAhBS0"
                            />
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent p-4 flex flex-col justify-end text-white"
                            >
                                <h4 class="text-lg font-headline font-bold">
                                    Coban Rondo Falls
                                </h4>
                                <p class="text-xs opacity-80">Kota Batu</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
        <!-- Footer -->
        <footer class="w-full bg-[#f8fafb] dark:bg-[#2e3132]">
            <div class="bg-[#e6e8e9] dark:bg-[#191c1d] h-[1px]"></div>
            <div
                class="flex flex-col md:flex-row justify-between items-center px-8 py-12 max-w-7xl mx-auto gap-4 font-inter text-sm leading-6"
            >
                <div class="flex flex-col gap-2">
                    <div class="font-manrope font-bold text-[#006565]">
                        Malang Raya Tourism Authority
                    </div>
                    <p class="text-slate-500 dark:text-slate-400">
                        © 2024 Malang Raya Tourism Authority. Intelligence by
                        FCM Clustering.
                    </p>
                </div>
                <div class="flex gap-8">
                    <a
                        class="text-slate-500 dark:text-slate-400 hover:text-[#006565] underline decoration-2 transition-all"
                        href="#"
                        >Visitor Stats: 12.4k this month</a
                    >
                    <a
                        class="text-slate-500 dark:text-slate-400 hover:text-[#006565] underline decoration-2 transition-all"
                        href="/directory"
                        >Directory</a
                    >
                    <a
                        class="text-slate-500 dark:text-slate-400 hover:text-[#006565] underline decoration-2 transition-all"
                        href="#"
                        >Privacy Policy</a
                    >
                </div>
            </div>
        </footer>
    </body>
</html>
