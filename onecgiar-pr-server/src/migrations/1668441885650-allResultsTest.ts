import { MigrationInterface, QueryRunner } from "typeorm"

export class allResultsTest1668441885650 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        3,
                                        1,
                                        1,
                                        307,
                                        2,
                                        'Womens self-help groups as a delivery platform for nutrition and health interventions in India',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        4,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Womens Empowerment in Fisheries Index (WEFI), a methodological tool for assessing women’s transformative change in fisheries and aquaculture.',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        5,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Womens Empowerment in Livestock Business Index (WELBI) tool',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        6,
                                        1,
                                        2,
                                        307,
                                        2,
                                        'Women as model farmers and change agents; effective integration into the development of climate-smart bean technologies and information in Rwanda',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        7,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Willingness-to-pay stress tolerant maize as an agricultural insurance product informing a strategy for mitigating production risk in Nigeria',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        8,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Wheat Yield Collaboration Yield Trial (WYCYT) nursery and International Wheat Yield Partnership Yield Potential Trait Experiment networks released in 2020',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        9,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Web-based map on knowledge and tools on implementation science for nutrition to support Scaling up Nutrition (SUN) countries',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        10,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Weather-rice-nutrient integrated decision support system (WeRise) in Philippines',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        11,
                                        1,
                                        3,
                                        307,
                                        2,
                                        'Weather-rice-nutrient integrated decision support system (WeRise) in Indonesia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        12,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Satellite nursery production of potato rooted apical cuttings by private sector in Kenya and Uganda',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        13,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Volunteer farmer trainer approach in Eastern Africa',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        14,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Solar bubble dryer for mushroom drying',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        15,
                                        1,
                                        1,
                                        307,
                                        2,
                                        'Using satellites to make Flood Index Insurance scalable and helping farmers survive floods in India and Bangladesh',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        16,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Using community conversations on animal health as a Gender Transformative Approach.',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        17,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Use of nudges to improve food safety in the pork value chain in Viet Nam',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        18,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Use of near-real-time global evidence from Google search data to estimate the immediate impacts of COVID-19 on demand for selected services',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        19,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Use of near-real-time global evidence from Google search data to estimate the immediate impacts of COVID-19 on demand for selected services',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        20,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Use of locally available ingredients to produce small ruminant feed in pellet form in Tunisia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        21,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Use of a positive deviance approach to inform farming systems redesign in Bihar, India ',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        22,
                                        1,
                                        3,
                                        307,
                                        3,
                                        'Upland rice-based cropping systems with conservation agriculture in Ivory Coast',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        23,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Unite for a Better Life, a gender-transformative educational intervention targeting prevention of intimate partner violence and HIV risk behaviors in Ethiopia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        24,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Unified breeding pipeline for trait development in rice',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        25,
                                        1,
                                        2,
                                        307,
                                        2,
                                        'Underutilised food species database with nutrition data, common and local names, medicinal uses and links to recipes',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        26,
                                        1,
                                        2,
                                        307,
                                        2,
                                        'Understanding G x E x M by global characterization of rice array panels ',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        27,
                                        1,
                                        3,
                                        307,
                                        3,
                                        'Understanding G x E x M by global characterization of rice array panels ',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        28,
                                        1,
                                        3,
                                        307,
                                        3,
                                        'Two-row Motorized Paddy Weeder for Irrigated and Rainfed Lowland Systems in Eastern Africa',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        29,
                                        1,
                                        3,
                                        307,
                                        2,
                                        'Two new white yam and three new water yam varieties for Nigeria with strong yield stability and high tuber yields and improved cooking and nutritional qualities',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        30,
                                        1,
                                        3,
                                        307,
                                        2,
                                        'Two Adapted Motorized Weeder (AMW) for irrigated and rainfed lowland systems in sub-Saharan Africa',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        31,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Toolkit to capture diversity and drivers of food choice of a target population to identify entry points for novel food products and nutritional interventions',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        32,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Toolbox for tools, guidelines, and templates for monitoring, reporting, and verification of Greenhouse Gas (GHG) calculation in rice in Vietnam',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        33,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Toolbox for sustainable rehabilitation of rangelands in arid environments',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        34,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Toolbox for monitoring, reporting, and verification (MRV) of greenhouse gass calculation in rice production',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        35,
                                        1,
                                        8,
                                        307,
                                        4,
                                        'Tool to monitor fruit and vegetable intake',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        36,
                                        1,
                                        8,
                                        307,
                                        4,
                                        'Tool for enhancing social inclusion through local dialogues on natural resource management',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        37,
                                        1,
                                        8,
                                        307,
                                        4,
                                        'Tool for enhancing social inclusion through local dialogues on natural resource management',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        38,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Tool for collecting food intake data to draw conclusions about diet quality  ',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        39,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Tool for assessing ecosystem services in Bamboo forests in Colombia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        40,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Two new white yam and three new water yam varieties for Senetal',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        41,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'GBIOH6: A new zinc biofortified maize variety in Colombia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        42,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'SEONT: Agricultural Household Survey Ontology',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        43,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Selection of 6 lines from the reference panel of the global Rice Array for breeding pipelines',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        44,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Seed quality assurance options for roots, tubers and bananas, including conclusions and recommendations from several cases studies',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        45,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Seed and soil health intervention framework for potato',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        46,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Scaling Readiness: a stepwise process to generate evidence for more effective scaling of innovation',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        47,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Scaling community seed banks to implement seed production',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        48,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Seeds for Needs, comprehensive package to promote selection of local varieties adapted to local conditions from national genebanks through farmers use, using crowdsourcing and citizen science approaches',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        49,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'TARIBEAN 5: A new iron biofortified bean variety in Tanzania and Nairobi',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        50,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Target Population of Environment (TPE) modelling as a synergy between Big Data Platform (BDP) and Excellence in Breeding (EiB) platforms and applications',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        51,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Development of web portal to improve local fruits markets based in Colombia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        52,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Understanding G x E x M by global characterization of rice array panels Colombia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        53,
                                        1,
                                        1,
                                        307,
                                        3,
                                        'Technical books for extension service and farmers to improve fertility and pest management of upland cropping systems in Madagascar and Etiophia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                        id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        54,
                                        1,
                                        1,
                                        307,
                                        2,
                                        'Set of training manuals for improving the quality and safety of informal dairy and pork value chains in Assam (India)',
                                        2022
                                    );
        `);
        
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        55,
                                        1,
                                        7,
                                        9,
                                        4,
                                        'Good agricultural practices for enhancing rice productivity in Colombia',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        56,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Subsurface water retention membrane (SWRM)/ Soil Water Retention Technology (SWRT) to restore and use sustainably, lands with sandy soils ',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        57,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Stripe rust associated genotyping-by-sequencing markers for marker-assisted selection and genomic profiles of 52,067 wheat breeding lines for stripe rust associated markers.',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        58,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Strategic research priority assessment toolkit to support investment and research portfolio decisions',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        59,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Standardized processing methods for boneless rohu (Labeo rohita) products in Odisha, India.',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        60,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Standardization of different artificial diets for rearing protocols and development of integrated pest management strategies for fall armyworm',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        61,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Standard Operating Procedure (SOP) for the inclusion of dried small fish in the Supplementary Nutrition Program (SNP) in Odisha, India',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        62,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Sorghum variety Telangana Jonna 1 for cultivation in dry mid-altitudes of India for grain yield, with biotic stress resistance, and high digestibility',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        63,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Solar Bubble Dryer, a mobile and low-cost drying technology for rice',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        64,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Social, political, environmental and technical adjustments for viability of rice-fish systems in Myanmar',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        65,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Smarter metrics in climate change and agriculture Business guidance for target-setting across productivity, resilience and mitigation.',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        66,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'SMART-Valleys: a new participatory approach for land and water management in Benin and Togo.',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        67,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Smart-Valleys approach in Burkina Faso, Liberia and Sierra Leone',
                                        2022
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title,
                                        reported_year_id
                                    )
                                VALUES
                                    (
                                        68,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Shwe Ngar (Golden Fish) App: a newly developed mobile App to support fish farmers in Myanmar',
                                        2022
                                    );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
