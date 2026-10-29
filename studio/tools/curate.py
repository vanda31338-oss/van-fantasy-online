# Curated LPC layer list for Legend Shorts Studio.
# key = sheet_definition file stem; value = list of variants to ship for
# non-recolourable items (None = all recolour items ship one source sheet).
# Picked for myths & legends: Greek, Norse, Egyptian, gothic, Asian.

BODIES = ["male", "female", "muscular"]

ITEMS = {
    # bodies
    "body": None, "body_skeleton": None, "body_zombie": ["zombie"],
    # heads
    "heads_human_male": None, "heads_human_female": None,
    "heads_human_male_elderly": None, "heads_human_female_elderly": None,
    "heads_human_male_gaunt": None, "heads_human_male_plump": None,
    "heads_minotaur": None, "heads_minotaur_female": None, "heads_wolf_male": None,
    "heads_lizard_male": None, "heads_lizard_female": None, "heads_orc_male": None,
    "heads_troll": None, "heads_goblin": None, "heads_skeleton": None,
    "heads_vampire": None, "heads_zombie": None, "heads_frankenstein": None,
    "heads_boarman": None, "heads_alien": None,
    # head parts
    "eyes_cyclops": None, "head_ears_elven": None, "head_ears_long": None,
    "head_horns_curled": None, "head_horns_backwards": None, "head_ears_dragon": None,
    "head_wrinkles": None,
    # hair
    "hair_long": None, "hair_long_straight": None, "hair_long_messy": None, "hair_xlong": None,
    "hair_xlong_wavy": None, "hair_wavy": None, "hair_princess": None, "hair_curly_long": None,
    "hair_curly_short": None, "hair_curls_large": None, "hair_bob": None, "hair_braid": None,
    "hair_ponytail": None, "hair_high_ponytail": None, "hair_long_tied": None,
    "hair_topknot_long": None, "hair_balding": None, "hair_buzzcut": None, "hair_plain": None,
    "hair_parted": None, "hair_messy1": None, "hair_spiked": None, "hair_unkempt": None,
    "hair_dreadlocks_long": None, "hair_afro": None, "hair_bangs": None, "hair_page": None,
    "hair_longhawk": None, "hair_loose": None, "hair_sara": None,
    # beards
    "beards_beard": None, "beards_medium": None, "beards_winter": None, "beards_trimmed": None,
    # torso
    "torso_clothes_robe": ["black", "white", "red", "purple", "blue", "dark gray"],
    "torso_clothes_tunic": ["white", "red", "blue", "black", "purple", "tan", "maroon", "forest"],
    "torso_clothes_sleeveless": ["white", "black", "red", "tan"],
    "torso_clothes_longsleeve": None, "torso_clothes_shortsleeve": None,
    "torso_clothes_sleeveless2": None, "torso_clothes_blouse": ["white", "black", "red"],
    "torso_clothes_blouse_longsleeve": ["white", "black", "red"],
    "torso_armour_plate": None, "torso_armour_leather": None, "torso_armour_legion": None,
    "torso_chainmail": None, "torso_bandages": ["white"],
    "dress_sash": ["white", "red", "black", "blue", "purple", "yellow"],
    "dress_slit": ["white", "red", "black", "blue", "purple"],
    "dress_kimono": ["white", "red", "black", "navy"], "dress_bodice": ["black", "white", "red"],
    "torso_clothes_corset": ["black", "red", "white"], "torso_clothes_vest": ["black", "brown", "white"],
    "torso_jacket_tabard": ["white", "red", "blue", "black"], "torso_jacket_iverness": None,
    "torso_jacket_frock": ["black", "red", "navy"], "torso_jacket_trench": None,
    # cape / neck / waist
    "cape_solid": None, "cape_tattered": None, "cape_trim": None,
    "neck_capeclip": None, "neck_capetie": None, "neck_necklace_beaded_large": None,
    "neck_necklace_beaded_small": None, "neck_scarf": None,
    "belt_sash": ["white", "red", "black", "yellow", "blue"], "belt_robe": None,
    "belt_leather": ["black", "brown"], "belt_mage": None,
    # arms & shoulders
    "arms_armour": None, "arms_gloves": None, "arms_bracers": None,
    "shoulders_legion": None, "shoulders_pauldrons": None, "shoulders_mantal": None,
    # legs
    "legs_pants": None, "legs_pants2": None, "legs_leggings": None, "legs_armour": None,
    "legs_skirts_legion": None, "legs_skirts_plain": None, "legs_skirts_slit": None,
    "legs_skirt_belle": None, "legs_skirt_straight": None,
    "legs_widepants": ["white", "black", "red", "blue"], "legs_shorts": None, "legs_hose": None,
    # feet
    "feet_sandals": None, "feet_boots_basic": None, "feet_boots_rim": None, "feet_armour": None,
    "feet_hoofs": None, "feet_slippers": None, "feet_shoes_basic": None,
    # headwear
    "hat_hood_cloth": None, "hat_hood_sack_cloth": None, "hat_hood_hijab": None,
    "hat_formal_crown": ["gold", "silver"], "hat_formal_tiara": ["gold", "silver"],
    "hat_magic_wizard": ["black", "purple", "blue"], "hat_magic_celestial": ["navy", "purple"],
    "hat_headband_thick": None, "hat_headband_tied": None, "hat_bandana": None,
    "hat_helmet_legion": None, "hat_helmet_maximus": None, "hat_helmet_barbarian_viking": None,
    "hat_helmet_barbarian": None, "hat_helmet_horned": None, "hat_helmet_spangenhelm_viking": None,
    "hat_helmet_nasal": None, "hat_helmet_close": None, "hat_helmet_greathelm": None,
    "hat_helmet_pointed": None, "hat_helmet_xeon": None,
    "hat_accessory_crest_centurion": None, "hat_accessory_plumage": None,
    "hat_accessory_wings": None, "hat_accessory_horns_upward": None,
    "hat_accessory_crest": None,
    # wings / tails
    "wings_feathered": ["white", "black", "gold", "red"], "wings_bat": ["black", "red", "dark gray"],
    "wings_lizard_bat": None, "wings_lunar": ["white", "blue"], "tail_lizard": None,
    "tail_wolf": ["black", "gray", "brown"],
    # weapons
    "weapon_sword_arming": ["steel", "gold", "bronze", "iron"], "weapon_sword_longsword": None,
    "weapon_sword_dagger": None, "weapon_sword_scimitar": None, "weapon_sword_katana": None,
    "weapon_sword_glowsword": None, "weapon_sword_saber": None,
    "weapon_polearm_spear": ["medium", "bronze", "gold", "iron"],
    "weapon_polearm_trident": ["gold", "bronze", "silver", "steel"],
    "weapon_polearm_longspear": ["medium", "bronze"], "weapon_polearm_scythe": None,
    "weapon_polearm_halberd": None,
    "weapon_blunt_mace": None, "weapon_blunt_waraxe": None, "weapon_blunt_club": None,
    "weapon_blunt_flail": None,
    "weapon_ranged_bow_normal": ["medium", "gold", "dark"], "weapon_ranged_bow_recurve": ["medium", "gold"],
    "weapon_ranged_bow_arrow": None,
    "weapon_magic_simple": None, "weapon_magic_gnarled": ["medium", "dark", "gold"],
    "weapon_magic_diamond": ["gold", "silver"], "weapon_magic_wand": None,
    "weapon_magic_s": ["gold", "dark"], "weapon_magic_loop": ["gold", "silver"],
    "weapon_magic_crystal": None,
    # shields
    "shield_round": ["silver", "gold", "brown", "black"], "shield_spartan": None,
    "shield_kite": None, "shield_scutum": None, "shield_scutum_trim": None,
    "shield_heater_wood": None, "shield_heater_trim": None, "shield_heater_paint": None,
    "shield_crusader": None,
    # misc
    "shadow": None,
}

# Thai-friendly category labels for the catalog
CATS = {
    "body": "body", "head": "head", "eyes": "head", "ears": "head", "horns": "head",
    "wrinkles": "head", "hair": "hair", "beard": "beard", "clothes": "torso", "armour": "torso",
    "chainmail": "torso", "bandages": "torso", "dress": "torso", "vest": "torso", "jacket": "torso",
    "cape": "cape", "cape_trim": "cape", "neck": "neck", "necklace": "neck", "belt": "waist",
    "sash": "waist", "arms": "arms", "gloves": "arms", "bracers": "arms", "shoulders": "arms",
    "legs": "legs", "apron": "legs", "shoes": "feet", "hat": "hat", "headcover": "hat",
    "bandana": "hat", "accessory": "hat", "wings": "wings", "tail": "tail", "weapon": "weapon",
    "weapon_magic_crystal": "weapon", "ammo": "weapon", "shield": "shield", "shield_trim": "shield",
    "shield_paint": "shield", "shadow": "shadow",
}
