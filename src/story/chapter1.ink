// chapter1.ink - 第一章故事
// 江湖郎中的起点
// 注意：此文件被 main.ink 包含，common.ink 已由 main.ink 引入

// ==================== 第一章变量 ====================

VAR chapter1_patients_healed = 0
VAR chapter1_total_patients = 4
VAR current_location_name = ""

// ==================== 开场白（用于MapScene显示）====================

=== chapter1_intro ===
第一章 · 初入江湖

你是一位刚入行的游方郎中，背着药箱行走在乡间小路上。

今日来到一个村庄，听说这里有病人需要救治。
-> DONE

// ==================== 故事入口 ====================

-> chapter1_start

=== chapter1_start ===
# background: village
# music: peaceful

你来到了村口。

* [进入村庄] -> enter_village
* [先在村外观察] -> observe_village

=== observe_village ===
你站在村口的老槐树下，观察着村庄的情况。

村口有几间茅草屋，炊烟袅袅。远处传来咳嗽声和呻吟声。

{ add_rep(1) }

看来确实有人生病了。

* [进入村庄] -> enter_village

=== enter_village ===
~ current_location_name = getCurrentLocation()

<> {get_narrator_text(current_location_name)}

-> location_event

=== location_event ===
{ chapter1_patients_healed >= chapter1_total_patients:
    -> chapter1_ending
}

你看到 {getPatientsCount()} 位病人等待治疗。

* [查看病人] -> check_patients
* [先去其他地方] -> go_to_map

=== check_patients ===
~ temp patient_name = getPatientName()

你走向病人，仔细查看病情。

病人：大夫，我这是{~风寒|风热|湿气}入体，求您救救我！

* [开始治疗] -> start_treatment
* [再观察一下] -> observe_patient

=== observe_patient ===
你仔细观察病人的症状：

{~面色苍白，手脚冰凉|发热口渴，面红目赤|身体沉重，精神萎靡}

这确实是{~风寒束表|风热犯肺|湿困脾胃}之症。

* [开始治疗] -> start_treatment
* [暂时离开] -> location_event

=== start_treatment ===
~ temp patient_id = getCurrentPatient()

你决定为病人诊治。

<> {villager_greeting}

-> battle_encounter(patient_id)

=== battle_encounter(patient_id) ===
{ startBattle(patient_id) }

-> END

=== battle_won_result ===
~ chapter1_patients_healed += 1
{ patient_healed() }
{ add_rep(2) }

<> {patient_thanks}

村民纷纷称赞：这位大夫医术高明！

{ chapter1_patients_healed >= chapter1_total_patients:
    -> chapter1_ending
}

* [继续治疗其他病人] -> location_event
* [休息一下] -> rest

=== battle_lost_result ===
{ battle_lost() }
{ sub_rep(1) }

<> {patient_disappointed}

村民摇头叹息：这大夫看来经验不足啊...

* [再次尝试] -> start_treatment
* [先去其他地方] -> go_to_map

=== rest ===
你找了个地方坐下，喝了口水，整理了一下药箱。

体力恢复了一些。

~ day += 1

* [继续治疗] -> location_event

=== go_to_map ===
{ goToMap() }

-> END

=== chapter1_ending ===
# background: sunset
# music: triumphant

~ chapter1_completed = true

第一章完成！

你成功治愈了 {chapter1_total_patients} 位病人，名声开始在附近传开。

{ get_rep_level() == "著名":
    村民们都说：这位大夫真是神医下凡！
- else:
    { get_rep_level() == "有名":
        村民们都说：这位大夫医术了得！
    - else:
        村民们说：这位大夫还算可靠。
    }
}

{ add_rep(5) }
{ add_money(50) }

{ showMessage("第一章完成！获得50文赏钱") }

* [继续旅程] -> chapter1_end

=== chapter1_end ===

夕阳西下，你背起药箱，继续踏上江湖之路。

第二章即将开启...

~ chapter2_unlocked = true

{ goToMap() }

-> END

// ==================== 特殊事件 ====================

=== random_event ===
{ shuffle:
    - -> event_wandering_doctor
    - -> event_village_elder
    - -> event_strange_herb
}

=== event_wandering_doctor ===
你遇到另一位游方郎中。

老郎中：年轻人，看你行色匆匆，可是去治病救人？

* [是的，前辈有何指教？] -> doctor_advice
* [只是路过] -> doctor_leave

=== doctor_advice ===
老郎中：治病救人，贵在用心。记住，{~君臣佐使，配伍有度|望闻问切，四诊合参|辨证论治，因人而异}。

{ add_rep(2) }

老郎中说完，飘然而去。

->->

=== doctor_leave ===
老郎中点点头，也自顾自地走了。

->->

=== event_village_elder ===
村中的长者拦住了你。

长者：大夫，我有一事相求。村里还有几位病人，请您务必救救他们。

* [义不容辞] -> elder_thanks
* [我尽力而为] -> elder_accept

=== elder_thanks ===
长者感激涕零：大夫仁心，老朽代全村谢过！

{ add_rep(3) }

->->

=== elder_accept ===
长者点头：有大夫这句话，老朽就放心了。

{ add_rep(1) }

->->

=== event_strange_herb ===
你在路边发现一株罕见的草药。

* [采摘] -> pick_herb
* [不采，留给需要的人] -> leave_herb

=== pick_herb ===
你小心地采摘了草药。

{ add_money(10) }

这株草药应该能卖个好价钱。

->->

=== leave_herb ===
你决定不采摘，让它继续生长。

{ add_rep(1) }

也许以后会有更需要它的人。

->->
