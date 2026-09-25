// various import
import {
	Action,
	ActionPanel,
	Detail,
	Icon,
	List,
	showToast,
	Toast,
	Color,
	useNavigation
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
import TurndownService, * as Turndown from "turndown"
// Turndownservice initialisation (to be able to transform html to markdown)
var turndownService = new TurndownService({codeBlockStyle: `fenced`})
var tables = require('turndown-plugin-gfm').tables

turndownService.use(tables)
turndownService.remove(function (node){
	return node.getAttribute('class') === 'mw-editsection-bracket'
}).remove(function (node){
	return node.getAttribute('class') === 'mw-editsection'
})
/*turndownService.addRule('codeIndent',{
	filter: ['pre','code'],
	replacement: function(content){
		return '```\n' + content + '```\n'
	}
})
*/
// custom interface to match Arch Wiki's response
interface SearchResult {
	query: string;
	titles: string[];
	description: string[];
	urls: string[];
}	

// Function to get a wiki page from it's title
function useWikiPage(title:any){
	// safety url encoding
	let urlEncodedTitle = encodeURI(title)
	// React thing to show while waiting for actual results
	const [wikiText, setWikiText] = useState<string>("Loading content...")
	useEffect(() => {
		//safety checks
		if (title == null) {
			return
		}
		if (title.length == 0 ){
			return
		}

		//actual fetch command, follow both HTTP redirect and Mediawiki page redirects
		fetch(`https://wiki.archlinux.org/api.php?action=parse&page=${urlEncodedTitle}&format=json&prop=text&redirects=1`,{redirect: 'follow'}).then((response) => {
			if (!response.ok) {

				throw new Error('Failed to fetch the page: ${response.status}');
			}
			// return the response's as json
			return response.json();
		}).then((data: any) => {
			//only parse the html in itself
			setWikiText(data.parse.text["*"])
			console.log(data.parse.text["*"])
		})
	// this make sure it only runs if the title change
	},[title])
	return wikiText
}

function useSearchWikiPage(searchTerm: string) {
	const defaultOuput = {} as SearchResult;
	defaultOuput.query =""
	defaultOuput.titles = []
	defaultOuput.description = []
	defaultOuput.urls = []
	const [wikiSearch, setWikiSearch] = useState<SearchResult>(defaultOuput)

	useEffect(() => {
		if (searchTerm.length == 0){
			setWikiSearch(defaultOuput)
			return
		}
		const timeout = setTimeout(() =>{

		
		const archWikiUrlRegexMarch = searchTerm.match(/^(https:\/\/)?(wiki.archlinux.org\/title\/)(.*)/)
		// Regex to check if an Arch Wiki url was pasted, if yes only take the title

		if (archWikiUrlRegexMarch){
			searchTerm=archWikiUrlRegexMarch[3]
		}
		
		let urlEncodedSearchTerm = encodeURI(searchTerm)
		console.log(`fetching api with title ${urlEncodedSearchTerm}`)

		fetch(`https://wiki.archlinux.org/api.php?action=opensearch&search=${urlEncodedSearchTerm}&list=search`).then((response) => {
			if (!response.ok){
				//Let the user know that an error occured
				showToast({ title: "Failed to fetch the search results",message: String(response.status),style: Toast.Style.Failure})
				throw new Error(`Failed to fetch the search page: ${response.status}`);
			}
			
			return response.json()
		}).then((data) => {
			//small bandaid so that the code doesn't implode if non-normal query is sent
			if (!Array.isArray(data)){
				// let the user know that they inputed a weird thing that broke
				showToast({title: "Unrecognized output", message: "Perhaps your query was invalid", style: Toast.Style.Failure})
				return
			}
			let typedData = data as [string,string[],string[],string[]]
			const searchResult = {} as SearchResult;
			searchResult.query = typedData[0]
			searchResult.titles = typedData[1]
			searchResult.description = typedData[2]
			searchResult.urls = typedData[3]
			
			
			setWikiSearch(searchResult)
		})
		},200)
		return() => clearTimeout(timeout)
	},[searchTerm])
	
	return wikiSearch

}

export default function ArchSeek() {
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	let selectedTitle
	let wikiText = {} as SearchResult;

	wikiText = useSearchWikiPage(query)
	if (selectedId != null){
		// safety check
		if (Number(selectedId) < wikiText.titles.length) {
			selectedTitle = wikiText.titles[Number(selectedId)]
		} 
	} else {
		// if selectedId is null, just return an empty selected title
		selectedTitle = ""
	}
	let wikiPage = useWikiPage(selectedTitle)

    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)}>
			{query === "" && wikiText.titles.length === 0 ? (
				<List.EmptyView title="No Page found" description="Try to search something else." icon={{ source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}} />
) : (
		 wikiText.titles.map((title, index) =>
			<List.Item id={String(index)} key={title} title={title} icon="Arch_Linux_logo.svg" detail={
				<List.Item.Detail markdown={`# ${title}\n\n`+turndownService.turndown(wikiPage)}/>
			} actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy wiki url to clipboard" content={wikiText.urls[index]} icon={Icon.CopyClipboard}/>
					<Action.OpenInBrowser title="Open wiki page in browser" url={wikiText.urls[index]} icon="Arch_Linux_logo.svg"/>
					<Action.Push title="Open in detail" target={<Detail markdown={`# ${title}\n\n`+turndownService.turndown(wikiPage)} /> } icon={Icon.AppWindow} />
				</ActionPanel>
			}/>
		) 
			)
			
		}
			</List>
	
    );
	}

