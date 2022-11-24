import { MigrationInterface, QueryRunner } from "typeorm"

export class results1668099540443 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        1,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'WorldFlora: R package to standardize Plant Names According to World Flora Online Taxonomic Backbone.'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        2,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'World Index for Sustainability and Healthy (WISH), a globally applicable index for healthy diets from sustainable food systems'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        3,
                                        1,
                                        1,
                                        307,
                                        2,
                                        'Womens self-help groups as a delivery platform for nutrition and health interventions in India'
                                        'www.google.com'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        4,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Womens Empowerment in Fisheries Index (WEFI), a methodological tool for assessing women’s transformative change in fisheries and aquaculture.'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        5,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Womens Empowerment in Livestock Business Index (WELBI) tool'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        6,
                                        1,
                                        2,
                                        307,
                                        2,
                                        'Women as model farmers and change agents; effective integration into the development of climate-smart bean technologies and information in Rwanda'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        7,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Willingness-to-pay stress tolerant maize as an agricultural insurance product informing a strategy for mitigating production risk in Nigeria'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        8,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Wheat Yield Collaboration Yield Trial (WYCYT) nursery and International Wheat Yield Partnership Yield Potential Trait Experiment networks released in 2020'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        9,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Web-based map on knowledge and tools on implementation science for nutrition to support Scaling up Nutrition (SUN) countries'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        10,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Weather-rice-nutrient integrated decision support system (WeRise) in Philippines'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        11,
                                        1,
                                        3,
                                        307,
                                        2,
                                        'Weather-rice-nutrient integrated decision support system (WeRise) in Indonesia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        12,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Satellite nursery production of potato rooted apical cuttings by private sector in Kenya and Uganda'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        13,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Volunteer farmer trainer approach in Eastern Africa'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        14,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Solar bubble dryer for mushroom drying'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        15,
                                        1,
                                        1,
                                        307,
                                        2,
                                        'Using satellites to make Flood Index Insurance scalable and helping farmers survive floods in India and Bangladesh'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        16,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Using community conversations on animal health as a Gender Transformative Approach.'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        17,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Use of nudges to improve food safety in the pork value chain in Viet Nam'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        18,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Use of near-real-time global evidence from Google search data to estimate the immediate impacts of COVID-19 on demand for selected services'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        19,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Use of near-real-time global evidence from Google search data to estimate the immediate impacts of COVID-19 on demand for selected services'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        20,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Use of locally available ingredients to produce small ruminant feed in pellet form in Tunisia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        21,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Use of a positive deviance approach to inform farming systems redesign in Bihar, India '
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        22,
                                        1,
                                        3,
                                        307,
                                        3,
                                        'Upland rice-based cropping systems with conservation agriculture in Ivory Coast'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        23,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Unite for a Better Life, a gender-transformative educational intervention targeting prevention of intimate partner violence and HIV risk behaviors in Ethiopia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        24,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Unified breeding pipeline for trait development in rice'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        25,
                                        1,
                                        2,
                                        307,
                                        2,
                                        'Underutilised food species database with nutrition data, common and local names, medicinal uses and links to recipes'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        26,
                                        1,
                                        2,
                                        307,
                                        2,
                                        'Understanding G x E x M by global characterization of rice array panels '
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        27,
                                        1,
                                        3,
                                        307,
                                        3,
                                        'Understanding G x E x M by global characterization of rice array panels '
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        28,
                                        1,
                                        3,
                                        307,
                                        3,
                                        'Two-row Motorized Paddy Weeder for Irrigated and Rainfed Lowland Systems in Eastern Africa'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        29,
                                        1,
                                        3,
                                        307,
                                        2,
                                        'Two new white yam and three new water yam varieties for Nigeria with strong yield stability and high tuber yields and improved cooking and nutritional qualities'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        30,
                                        1,
                                        3,
                                        307,
                                        2,
                                        'Two Adapted Motorized Weeder (AMW) for irrigated and rainfed lowland systems in sub-Saharan Africa'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        31,
                                        1,
                                        4,
                                        307,
                                        2,
                                        'Toolkit to capture diversity and drivers of food choice of a target population to identify entry points for novel food products and nutritional interventions'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        32,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Toolbox for tools, guidelines, and templates for monitoring, reporting, and verification of Greenhouse Gas (GHG) calculation in rice in Vietnam'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        33,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Toolbox for sustainable rehabilitation of rangelands in arid environments'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        34,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Toolbox for monitoring, reporting, and verification (MRV) of greenhouse gass calculation in rice production'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        35,
                                        1,
                                        8,
                                        307,
                                        4,
                                        'Tool to monitor fruit and vegetable intake'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        36,
                                        1,
                                        8,
                                        307,
                                        4,
                                        'Tool for enhancing social inclusion through local dialogues on natural resource management'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        37,
                                        1,
                                        8,
                                        307,
                                        4,
                                        'Tool for enhancing social inclusion through local dialogues on natural resource management'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        38,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Tool for collecting food intake data to draw conclusions about diet quality  '
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        39,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Tool for assessing ecosystem services in Bamboo forests in Colombia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        40,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Two new white yam and three new water yam varieties for Senetal'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        41,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'GBIOH6: A new zinc biofortified maize variety in Colombia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        42,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'SEONT: Agricultural Household Survey Ontology'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        43,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Selection of 6 lines from the reference panel of the global Rice Array for breeding pipelines'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        44,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Seed quality assurance options for roots, tubers and bananas, including conclusions and recommendations from several cases studies'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        45,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Seed and soil health intervention framework for potato'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        46,
                                        1,
                                        2,
                                        307,
                                        3,
                                        'Scaling Readiness: a stepwise process to generate evidence for more effective scaling of innovation'
                                        'test'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        47,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Scaling community seed banks to implement seed production'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        48,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Seeds for Needs, comprehensive package to promote selection of local varieties adapted to local conditions from national genebanks through farmers use, using crowdsourcing and citizen science approaches'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        49,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'TARIBEAN 5: A new iron biofortified bean variety in Tanzania and Nairobi'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        50,
                                        1,
                                        5,
                                        307,
                                        4,
                                        'Target Population of Environment (TPE) modelling as a synergy between Big Data Platform (BDP) and Excellence in Breeding (EiB) platforms and applications'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        51,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Development of web portal to improve local fruits markets based in Colombia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        52,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Understanding G x E x M by global characterization of rice array panels Colombia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        53,
                                        1,
                                        1,
                                        307,
                                        3,
                                        'Technical books for extension service and farmers to improve fertility and pest management of upland cropping systems in Madagascar and Etiophia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        55,
                                        1,
                                        7,
                                        9,
                                        4,
                                        'Good agricultural practices for enhancing rice productivity in Colombia'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        56,
                                        1,
                                        7,
                                        307,
                                        4,
                                        'Subsurface water retention membrane (SWRM)/ Soil Water Retention Technology (SWRT) to restore and use sustainably, lands with sandy soils '
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        57,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Stripe rust associated genotyping-by-sequencing markers for marker-assisted selection and genomic profiles of 52,067 wheat breeding lines for stripe rust associated markers.'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        58,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Strategic research priority assessment toolkit to support investment and research portfolio decisions'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        59,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Standardized processing methods for boneless rohu (Labeo rohita) products in Odisha, India.'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        60,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Standardization of different artificial diets for rearing protocols and development of integrated pest management strategies for fall armyworm'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        61,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Standard Operating Procedure (SOP) for the inclusion of dried small fish in the Supplementary Nutrition Program (SNP) in Odisha, India'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        62,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Sorghum variety Telangana Jonna 1 for cultivation in dry mid-altitudes of India for grain yield, with biotic stress resistance, and high digestibility'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        63,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Solar Bubble Dryer, a mobile and low-cost drying technology for rice'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        64,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Social, political, environmental and technical adjustments for viability of rice-fish systems in Myanmar'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        65,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Smarter metrics in climate change and agriculture Business guidance for target-setting across productivity, resilience and mitigation.'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        66,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'SMART-Valleys: a new participatory approach for land and water management in Benin and Togo.'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        67,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Smart-Valleys approach in Burkina Faso, Liberia and Sierra Leone'
                                    );
        `);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        69,
                                        1,
                                        9,
                                        307,
                                        1,
                                        'Shwe Ngar (Golden Fish) App: a newly developed mobile App to support fish farmers in Myanmar'
                                    );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
